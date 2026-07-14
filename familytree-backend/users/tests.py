"""Тесты аутентификации: регистрация, логин, обновление access-токена по refresh
(п. 1.1 плана — раньше этот файл был пустым stub'ом)."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class RegisterTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_creates_user_and_returns_tokens(self):
        resp = self.client.post('/api/auth/register/', {
            'username': 'newuser', 'email': 'newuser@example.com', 'password': 'S3curePass!23',
        })
        self.assertEqual(resp.status_code, 200, resp.content)
        data = resp.json()
        self.assertEqual(data['username'], 'newuser')
        self.assertIn('access', data)
        self.assertIn('refresh', data)
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_register_hashes_password(self):
        self.client.post('/api/auth/register/', {
            'username': 'hashuser', 'email': 'hash@example.com', 'password': 'S3curePass!23',
        })
        user = User.objects.get(username='hashuser')
        self.assertNotEqual(user.password, 'S3curePass!23')
        self.assertTrue(user.check_password('S3curePass!23'))

    def test_register_duplicate_username_fails(self):
        User.objects.create_user(username='taken', password='S3curePass!23')
        resp = self.client.post('/api/auth/register/', {
            'username': 'taken', 'email': 'other@example.com', 'password': 'S3curePass!23',
        })
        self.assertEqual(resp.status_code, 400)
        self.assertIn('username', resp.json())


class LoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='logintest', password='S3curePass!23')

    def test_login_with_correct_credentials_returns_tokens(self):
        resp = self.client.post('/api/auth/login/', {'username': 'logintest', 'password': 'S3curePass!23'})
        self.assertEqual(resp.status_code, 200, resp.content)
        data = resp.json()
        self.assertIn('access', data)
        self.assertIn('refresh', data)

    def test_login_with_wrong_password_returns_401(self):
        resp = self.client.post('/api/auth/login/', {'username': 'logintest', 'password': 'wrong'})
        self.assertEqual(resp.status_code, 401)

    def test_login_with_unknown_username_returns_401(self):
        resp = self.client.post('/api/auth/login/', {'username': 'ghost', 'password': 'whatever'})
        self.assertEqual(resp.status_code, 401)


class TokenRefreshTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='refreshtest', password='S3curePass!23')

    def test_refresh_returns_new_access_token(self):
        refresh = RefreshToken.for_user(self.user)
        resp = self.client.post('/api/auth/refresh/', {'refresh': str(refresh)})
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertIn('access', resp.json())

    def test_refresh_with_garbage_token_fails(self):
        resp = self.client.post('/api/auth/refresh/', {'refresh': 'not-a-real-token'})
        self.assertEqual(resp.status_code, 401)


class LogoutTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='logouttest', password='S3curePass!23')

    def _authed_client(self):
        client = APIClient()
        refresh = RefreshToken.for_user(self.user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        return client, refresh

    def test_logout_blacklists_refresh_token(self):
        client, refresh = self._authed_client()
        resp = client.post('/api/auth/logout/', {'refresh': str(refresh)})
        self.assertEqual(resp.status_code, 204)

        # тот же refresh больше не годится для получения нового access
        resp2 = APIClient().post('/api/auth/refresh/', {'refresh': str(refresh)})
        self.assertEqual(resp2.status_code, 401)

    def test_logout_requires_authentication(self):
        resp = APIClient().post('/api/auth/logout/', {'refresh': 'whatever'})
        self.assertEqual(resp.status_code, 401)

    def test_logout_without_refresh_field_fails(self):
        client, _ = self._authed_client()
        resp = client.post('/api/auth/logout/', {})
        self.assertEqual(resp.status_code, 400)

    def test_logout_with_garbage_refresh_fails(self):
        client, _ = self._authed_client()
        resp = client.post('/api/auth/logout/', {'refresh': 'not-a-real-token'})
        self.assertEqual(resp.status_code, 400)

    def test_logout_twice_with_same_token_fails_second_time(self):
        client, refresh = self._authed_client()
        first = client.post('/api/auth/logout/', {'refresh': str(refresh)})
        self.assertEqual(first.status_code, 204)
        second = client.post('/api/auth/logout/', {'refresh': str(refresh)})
        self.assertEqual(second.status_code, 400)


class AuthenticatedAccessTests(TestCase):
    """Проверяет, что защищённые эндпоинты реально требуют access-токен."""

    def test_trees_list_requires_authentication(self):
        resp = APIClient().get('/api/trees/')
        self.assertEqual(resp.status_code, 401)

    def test_trees_list_works_with_valid_access_token(self):
        user = User.objects.create_user(username='authcheck', password='S3curePass!23')
        client = APIClient()
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        resp = client.get('/api/trees/')
        self.assertEqual(resp.status_code, 200)


class ProfileTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='profiletest', password='S3curePass!23', email='old@example.com', first_name='Old',
        )
        self.client = APIClient()
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_get_profile_requires_authentication(self):
        resp = APIClient().get('/api/auth/me/')
        self.assertEqual(resp.status_code, 401)

    def test_get_profile_returns_current_user(self):
        resp = self.client.get('/api/auth/me/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data['username'], 'profiletest')
        self.assertEqual(data['email'], 'old@example.com')

    def test_patch_updates_first_and_last_name(self):
        resp = self.client.patch('/api/auth/me/', {'first_name': 'New', 'last_name': 'Name'}, format='json')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'New')
        self.assertEqual(self.user.last_name, 'Name')

    def test_patch_cannot_change_username_or_email(self):
        resp = self.client.patch(
            '/api/auth/me/', {'username': 'hijacked', 'email': 'new@example.com'}, format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'profiletest')
        self.assertEqual(self.user.email, 'old@example.com')


class ChangePasswordTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='pwdtest', password='OldPass123!')
        self.client = APIClient()
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_change_password_succeeds_with_correct_old_password(self):
        resp = self.client.post('/api/auth/change-password/', {
            'old_password': 'OldPass123!', 'new_password': 'BrandNewPass456!',
        })
        self.assertEqual(resp.status_code, 204)

        login_resp = APIClient().post('/api/auth/login/', {'username': 'pwdtest', 'password': 'BrandNewPass456!'})
        self.assertEqual(login_resp.status_code, 200)

    def test_change_password_fails_with_wrong_old_password(self):
        resp = self.client.post('/api/auth/change-password/', {
            'old_password': 'WrongPass', 'new_password': 'BrandNewPass456!',
        })
        self.assertEqual(resp.status_code, 400)
        self.assertIn('old_password', resp.json())

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('OldPass123!'))

    def test_change_password_rejects_weak_new_password(self):
        resp = self.client.post('/api/auth/change-password/', {
            'old_password': 'OldPass123!', 'new_password': '123',
        })
        self.assertEqual(resp.status_code, 400)
        self.assertIn('new_password', resp.json())

    def test_change_password_requires_authentication(self):
        resp = APIClient().post('/api/auth/change-password/', {
            'old_password': 'OldPass123!', 'new_password': 'BrandNewPass456!',
        })
        self.assertEqual(resp.status_code, 401)
