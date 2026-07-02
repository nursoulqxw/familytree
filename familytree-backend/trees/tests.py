from django.contrib.auth import get_user_model
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.db import connection
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from .models import FamilyTree, TreeMember, Person, Relationship

User = get_user_model()


class QueryCountRegressionTests(TestCase):
    """Регрессионные тесты на N+1 (п. 3.2 ТЗ): число SQL-запросов не должно расти
    вместе с количеством деревьев/персон/связей в ответе."""

    def setUp(self):
        self.user = User.objects.create_user(username='q_owner', password='testpass123')
        self.client = APIClient()
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def _make_trees(self, count, persons_per_tree=2):
        FamilyTree.objects.filter(owner=self.user).delete()
        tree = None
        for i in range(count):
            tree = FamilyTree.objects.create(owner=self.user, name=f'Tree {i}')
            TreeMember.objects.create(tree=tree, user=self.user, role='owner')
            people = [
                Person.objects.create(tree=tree, first_name=f'P{i}{j}', last_name='Test')
                for j in range(persons_per_tree)
            ]
            for a, b in zip(people, people[1:]):
                Relationship.objects.create(tree=tree, person_from=a, person_to=b, relationship_type='sibling')
        return tree

    def _query_count(self, url):
        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get(url)
        self.assertEqual(response.status_code, 200, response.content)
        return len(ctx.captured_queries)

    def test_tree_list_query_count_is_flat(self):
        # раньше FamilyTreeDetailSerializer вкладывал persons+relationships в list,
        # что стоило +2 запроса на КАЖДОЕ дерево в списке
        self._make_trees(2)
        small = self._query_count('/api/trees/')

        self._make_trees(8)
        large = self._query_count('/api/trees/')

        self.assertEqual(small, large, 'GET /api/trees/ не должен делать больше запросов при росте числа деревьев')

    def test_full_tree_query_count_is_flat(self):
        tree = self._make_trees(1, persons_per_tree=2)
        small = self._query_count(f'/api/trees/{tree.id}/full_tree/')

        tree2 = self._make_trees(1, persons_per_tree=10)
        large = self._query_count(f'/api/trees/{tree2.id}/full_tree/')

        self.assertEqual(small, large, 'full_tree не должен делать больше запросов при росте числа persons/relationships')

    def test_persons_list_query_count_is_flat(self):
        tree = self._make_trees(1, persons_per_tree=2)
        small = self._query_count(f'/api/trees/{tree.id}/persons/')

        tree2 = self._make_trees(1, persons_per_tree=10)
        large = self._query_count(f'/api/trees/{tree2.id}/persons/')

        self.assertEqual(small, large)

    def test_relationships_list_query_count_is_flat(self):
        tree = self._make_trees(1, persons_per_tree=2)
        small = self._query_count(f'/api/trees/{tree.id}/relationships/')

        tree2 = self._make_trees(1, persons_per_tree=10)
        large = self._query_count(f'/api/trees/{tree2.id}/relationships/')

        self.assertEqual(small, large)


class AncestryChainTests(TestCase):
    """Рекурсивный CTE для ancestors/descendants (п. 3.1 ТЗ)."""

    def setUp(self):
        self.user = User.objects.create_user(username='chain_owner', password='testpass123')
        self.client = APIClient()
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        self.tree = FamilyTree.objects.create(owner=self.user, name='Chain Tree')
        TreeMember.objects.create(tree=self.tree, user=self.user, role='owner')

    def _make_chain(self, length):
        """Линейная цепочка parent-связей: p0 -> p1 -> ... -> p{length}, где self = p{length//2}."""
        people = [
            Person.objects.create(tree=self.tree, first_name=f'Gen{i}', last_name='Chain')
            for i in range(length + 1)
        ]
        for parent, child in zip(people, people[1:]):
            Relationship.objects.create(
                tree=self.tree, person_from=parent, person_to=child, relationship_type='parent'
            )
        return people

    def test_ancestors_and_descendants_are_correct(self):
        # GGP(0) -> GP(1) -> P(2) -> SELF(3) -> CHILD(4) -> GRANDCHILD(5)
        people = self._make_chain(5)
        self_person = people[3]

        # брат/сестра (sibling) не должен попадать в ancestors/descendants — не parent-связь
        sibling = Person.objects.create(tree=self.tree, first_name='Sibling', last_name='Chain')
        Relationship.objects.create(
            tree=self.tree, person_from=self_person, person_to=sibling, relationship_type='sibling'
        )

        resp = self.client.get(f'/api/trees/{self.tree.id}/persons/{self_person.id}/ancestors/')
        self.assertEqual(resp.status_code, 200)
        ancestors = {(item['id'], item['depth']) for item in resp.json()}
        self.assertEqual(ancestors, {(people[2].id, 1), (people[1].id, 2), (people[0].id, 3)})

        resp = self.client.get(f'/api/trees/{self.tree.id}/persons/{self_person.id}/descendants/')
        self.assertEqual(resp.status_code, 200)
        descendants = {(item['id'], item['depth']) for item in resp.json()}
        self.assertEqual(descendants, {(people[4].id, 1), (people[5].id, 2)})

    def test_query_count_does_not_grow_with_chain_depth(self):
        short_chain = self._make_chain(3)
        with CaptureQueriesContext(connection) as ctx_short:
            resp = self.client.get(f'/api/trees/{self.tree.id}/persons/{short_chain[0].id}/descendants/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 3)

        long_tree = FamilyTree.objects.create(owner=self.user, name='Long Chain Tree')
        TreeMember.objects.create(tree=long_tree, user=self.user, role='owner')
        self.tree = long_tree
        long_chain = self._make_chain(15)
        with CaptureQueriesContext(connection) as ctx_long:
            resp = self.client.get(f'/api/trees/{long_tree.id}/persons/{long_chain[0].id}/descendants/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 15)

        self.assertEqual(
            len(ctx_short.captured_queries), len(ctx_long.captured_queries),
            'Число SQL-запросов не должно расти с глубиной цепочки поколений',
        )

    def test_cyclic_relationship_does_not_hang(self):
        # кривые данные: A — родитель B, B — родитель A (не должно случиться в норме, но CTE должен пережить)
        a = Person.objects.create(tree=self.tree, first_name='A', last_name='Cycle')
        b = Person.objects.create(tree=self.tree, first_name='B', last_name='Cycle')
        Relationship.objects.create(tree=self.tree, person_from=a, person_to=b, relationship_type='parent')
        Relationship.objects.create(tree=self.tree, person_from=b, person_to=a, relationship_type='parent')

        resp = self.client.get(f'/api/trees/{self.tree.id}/persons/{a.id}/ancestors/')
        self.assertEqual(resp.status_code, 200)
        ids = {item['id'] for item in resp.json()}
        self.assertEqual(ids, {a.id, b.id})
