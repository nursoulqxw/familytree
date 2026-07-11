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
