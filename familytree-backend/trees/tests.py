import shutil
import tempfile

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from django.db import connection
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from .models import FamilyTree, TreeMember, Person, Relationship, Notification, Media

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


class NotificationTests(TestCase):
    """Уведомления через сигнал на AuditLog (п. 2.4 ТЗ)."""

    def setUp(self):
        self.owner = User.objects.create_user(username='notif_owner', password='testpass123')
        self.editor = User.objects.create_user(username='notif_editor', password='testpass123')
        self.reader = User.objects.create_user(username='notif_reader', password='testpass123')

        self.tree = FamilyTree.objects.create(owner=self.owner, name='Notif Tree')
        TreeMember.objects.create(tree=self.tree, user=self.owner, role='owner')
        TreeMember.objects.create(tree=self.tree, user=self.editor, role='editor')
        TreeMember.objects.create(tree=self.tree, user=self.reader, role='reader')

        self.editor_client = APIClient()
        refresh = RefreshToken.for_user(self.editor)
        self.editor_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def _client_for(self, user):
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        return client

    def test_notification_created_for_other_members_but_not_actor(self):
        resp = self.editor_client.post(
            f'/api/trees/{self.tree.id}/persons/',
            {'first_name': 'New', 'last_name': 'Person'},
        )
        self.assertEqual(resp.status_code, 201, resp.content)

        # владелец и читатель получили уведомление, редактор (автор) — нет
        self.assertTrue(Notification.objects.filter(user=self.owner, tree=self.tree).exists())
        self.assertTrue(Notification.objects.filter(user=self.reader, tree=self.tree).exists())
        self.assertFalse(Notification.objects.filter(user=self.editor, tree=self.tree).exists())

    def test_unread_filter_and_mark_read(self):
        self.editor_client.post(f'/api/trees/{self.tree.id}/persons/', {'first_name': 'A', 'last_name': 'B'})
        owner_client = self._client_for(self.owner)

        resp = owner_client.get('/api/notifications/?unread=true')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data), 1)
        self.assertFalse(data[0]['is_read'])
        notification_id = data[0]['id']

        # вложенный audit_log должен быть виден получателю уведомления
        self.assertEqual(data[0]['audit_log']['content_type'], 'Person')

        mark_resp = owner_client.post(f'/api/notifications/{notification_id}/mark_read/')
        self.assertEqual(mark_resp.status_code, 200)

        resp2 = owner_client.get('/api/notifications/?unread=true')
        self.assertEqual(resp2.json(), [])

    def test_mark_all_read(self):
        self.editor_client.post(f'/api/trees/{self.tree.id}/persons/', {'first_name': 'A', 'last_name': 'B'})
        self.editor_client.post(f'/api/trees/{self.tree.id}/persons/', {'first_name': 'C', 'last_name': 'D'})
        owner_client = self._client_for(self.owner)

        self.assertEqual(Notification.objects.filter(user=self.owner, is_read=False).count(), 2)
        resp = owner_client.post('/api/notifications/mark_all_read/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['marked_read'], 2)
        self.assertEqual(Notification.objects.filter(user=self.owner, is_read=False).count(), 0)

    def test_notification_list_query_count_is_flat(self):
        owner_client = self._client_for(self.owner)
        for i in range(2):
            self.editor_client.post(f'/api/trees/{self.tree.id}/persons/', {'first_name': f'P{i}', 'last_name': 'X'})
        with CaptureQueriesContext(connection) as ctx_small:
            resp = owner_client.get('/api/notifications/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 2)

        for i in range(8):
            self.editor_client.post(f'/api/trees/{self.tree.id}/persons/', {'first_name': f'Q{i}', 'last_name': 'X'})
        with CaptureQueriesContext(connection) as ctx_large:
            resp2 = owner_client.get('/api/notifications/')
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(len(resp2.json()), 10)

        self.assertEqual(
            len(ctx_small.captured_queries), len(ctx_large.captured_queries),
            'GET /api/notifications/ не должен делать больше запросов при росте числа уведомлений',
        )


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class MediaGalleryTests(TestCase):
    """Медиа-галерея персоны (архивные фото/сканы, не привязанные к LifeEvent)."""

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(settings.MEDIA_ROOT, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.owner = User.objects.create_user(username='media_owner', password='testpass123')
        self.editor = User.objects.create_user(username='media_editor', password='testpass123')
        self.reader = User.objects.create_user(username='media_reader', password='testpass123')

        self.tree = FamilyTree.objects.create(owner=self.owner, name='Media Tree')
        TreeMember.objects.create(tree=self.tree, user=self.owner, role='owner')
        TreeMember.objects.create(tree=self.tree, user=self.editor, role='editor')
        TreeMember.objects.create(tree=self.tree, user=self.reader, role='reader')
        self.person = Person.objects.create(tree=self.tree, first_name='Ancestor', last_name='One')

        self.owner_client = self._client_for(self.owner)
        self.editor_client = self._client_for(self.editor)
        self.reader_client = self._client_for(self.reader)

    def _client_for(self, user):
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        return client

    def _media_url(self, suffix=''):
        return f'/api/trees/{self.tree.id}/persons/{self.person.id}/media/{suffix}'

    def _fake_file(self, name='scan.pdf'):
        return SimpleUploadedFile(name, b'not-a-real-file-just-bytes', content_type='application/octet-stream')

    def test_editor_can_upload_and_owner_can_list(self):
        resp = self.editor_client.post(self._media_url(), {'file': self._fake_file(), 'caption': 'Old scan'})
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(resp.json()['caption'], 'Old scan')

        resp = self.owner_client.get(self._media_url())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 1)

    def test_reader_cannot_upload(self):
        resp = self.reader_client.post(self._media_url(), {'file': self._fake_file()})
        self.assertEqual(resp.status_code, 403)

    def test_stranger_has_no_access(self):
        stranger = User.objects.create_user(username='media_stranger', password='testpass123')
        stranger_client = self._client_for(stranger)
        resp = stranger_client.get(self._media_url())
        self.assertEqual(resp.status_code, 403)

    def test_full_tree_does_not_include_media(self):
        # медиа-галерея не должна попадать в full_tree (ленивая загрузка, п. 3.1 ТЗ)
        self.editor_client.post(self._media_url(), {'file': self._fake_file()})
        resp = self.owner_client.get(f'/api/trees/{self.tree.id}/full_tree/')
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn('media', str(resp.json()['persons']))

    def test_media_list_query_count_is_flat(self):
        for i in range(2):
            self.editor_client.post(self._media_url(), {'file': self._fake_file(f'a{i}.pdf')})
        with CaptureQueriesContext(connection) as ctx_small:
            resp = self.owner_client.get(self._media_url())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 2)

        for i in range(8):
            self.editor_client.post(self._media_url(), {'file': self._fake_file(f'b{i}.pdf')})
        with CaptureQueriesContext(connection) as ctx_large:
            resp2 = self.owner_client.get(self._media_url())
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(len(resp2.json()), 10)

        self.assertEqual(len(ctx_small.captured_queries), len(ctx_large.captured_queries))


class PublicTreeCatalogTests(TestCase):
    """Каталог публичных деревьев GET /api/trees/public/."""

    def setUp(self):
        self.owner = User.objects.create_user(username='catalog_owner', password='testpass123')
        self.stranger = User.objects.create_user(username='catalog_stranger', password='testpass123')

        self.public_tree = FamilyTree.objects.create(owner=self.owner, name='Open Family', privacy='public')
        TreeMember.objects.create(tree=self.public_tree, user=self.owner, role='owner')

        self.private_tree = FamilyTree.objects.create(owner=self.owner, name='Secret Family', privacy='private')
        TreeMember.objects.create(tree=self.private_tree, user=self.owner, role='owner')

        self.link_tree = FamilyTree.objects.create(owner=self.owner, name='Link Family', privacy='link')
        TreeMember.objects.create(tree=self.link_tree, user=self.owner, role='owner')

        self.stranger_client = APIClient()
        refresh = RefreshToken.for_user(self.stranger)
        self.stranger_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_stranger_sees_only_public_trees_in_catalog(self):
        resp = self.stranger_client.get('/api/trees/public/')
        self.assertEqual(resp.status_code, 200)
        ids = {item['id'] for item in resp.json()}
        self.assertEqual(ids, {self.public_tree.id})  # ни private, ни link сюда не попадают

    def test_stranger_personal_list_is_not_affected_by_catalog(self):
        # GET /api/trees/ остаётся "моими деревьями" и не показывает чужие public-деревья
        resp = self.stranger_client.get('/api/trees/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), [])

    def test_catalog_query_count_is_flat(self):
        with CaptureQueriesContext(connection) as ctx_small:
            resp = self.stranger_client.get('/api/trees/public/')
        self.assertEqual(resp.status_code, 200)

        for i in range(8):
            FamilyTree.objects.create(owner=self.owner, name=f'Extra Public {i}', privacy='public')
        with CaptureQueriesContext(connection) as ctx_large:
            resp2 = self.stranger_client.get('/api/trees/public/')
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(len(resp2.json()), 9)  # 1 исходное + 8 новых

        self.assertEqual(len(ctx_small.captured_queries), len(ctx_large.captured_queries))
