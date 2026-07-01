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
