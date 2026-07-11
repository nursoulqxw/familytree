# users/serializers.py
"""Сериализаторы приложения users: регистрация, логин и ответы с JWT-токенами."""
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Валидирует и создаёт нового пользователя по username/email/password."""
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def create(self, validated_data):
        """Создаёт пользователя через create_user, чтобы пароль был захэширован
        (а не сохранён в открытом виде, как было бы при обычном Model.objects.create)."""
        user = User.objects.create_user(**validated_data)
        return user


class LoginSerializer(serializers.Serializer):
    """Только для документации Swagger — тело запроса POST /api/auth/login/.
    Сама вьюха login() читает request.data напрямую, этот класс не используется
    для валидации, только чтобы drf-spectacular знал форму запроса."""
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class TokenResponseSerializer(serializers.Serializer):
    """Форма ответа с парой JWT-токенов (используется в register/login)."""
    access = serializers.CharField()
    refresh = serializers.CharField()


class RegisterResponseSerializer(TokenResponseSerializer):
    """Форма ответа register() — токены плюс базовые данные созданного пользователя."""
    user_id = serializers.IntegerField()
    username = serializers.CharField()


class LogoutSerializer(serializers.Serializer):
    """Только для документации Swagger — тело запроса POST /api/auth/logout/."""
    refresh = serializers.CharField()
