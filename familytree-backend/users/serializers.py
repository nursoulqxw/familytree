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


class UserProfileSerializer(serializers.ModelSerializer):
    """Профиль текущего пользователя (GET/PATCH /api/auth/me/). username и email — по
    сути логин, менять их через этот эндпоинт нельзя (email хоть и не используется для
    входа, менять его без подтверждения владения ящиком было бы небезопасно)."""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'created_at']
        read_only_fields = ['id', 'username', 'email', 'created_at']


class ChangePasswordSerializer(serializers.Serializer):
    """Только для документации Swagger — тело запроса POST /api/auth/change-password/."""
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
