# users/views.py
"""Аутентификация: регистрация, логин и логаут по username/password.
Регистрация и логин — простые function-based views (@api_view), доступны без
авторизации (AllowAny), выдают пару JWT-токенов (access/refresh) через simplejwt.
Логаут требует валидный access-токен и отзывает переданный refresh-токен
(добавляет его в blacklist — rest_framework_simplejwt.token_blacklist)."""
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from drf_spectacular.utils import extend_schema
from .serializers import (
    UserRegistrationSerializer, LoginSerializer, RegisterResponseSerializer, TokenResponseSerializer,
    LogoutSerializer, UserProfileSerializer, ChangePasswordSerializer,
)


@extend_schema(request=UserRegistrationSerializer, responses=RegisterResponseSerializer)
@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Регистрирует нового пользователя и сразу выдаёт JWT-токены (авто-логин после регистрации).

    Возвращает 400 с ошибками валидации, если username/email заняты или пароль не проходит
    AUTH_PASSWORD_VALIDATORS.
    """
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user_id': user.id,
            'username': user.username,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })
    return Response(serializer.errors, status=400)


@extend_schema(request=LoginSerializer, responses=TokenResponseSerializer)
@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Проверяет username/password через стандартный Django authenticate()
    и при успехе выдаёт новую пару JWT-токенов. При неверных данных — 401."""
    from django.contrib.auth import authenticate
    username = request.data.get('username')
    password = request.data.get('password')

    user = authenticate(username=username, password=password)
    if user:
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })
    return Response({'error': 'Invalid credentials'}, status=401)


@extend_schema(request=LogoutSerializer, responses=None)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """Отзывает refresh-токен (добавляет в blacklist), чтобы им нельзя было
    получить новый access после выхода. Сам access-токен, которым выполнен
    этот запрос, естественным образом истечёт по ACCESS_TOKEN_LIFETIME —
    simplejwt не поддерживает мгновенный отзыв access-токенов без Redis-кеша."""
    token = request.data.get('refresh')
    if not token:
        return Response({'error': 'Поле refresh обязательно'}, status=400)
    try:
        RefreshToken(token).blacklist()
    except TokenError:
        return Response({'error': 'Невалидный или уже отозванный refresh-токен'}, status=400)
    return Response(status=204)


@extend_schema(responses=UserProfileSerializer)
@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile(request):
    """Профиль текущего пользователя. GET — просмотр; PATCH — редактирование
    (только first_name/last_name — username и email через этот эндпоинт не меняются)."""
    if request.method == 'GET':
        return Response(UserProfileSerializer(request.user).data)

    serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@extend_schema(request=ChangePasswordSerializer, responses=None)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Смена пароля текущего пользователя — требует правильный текущий пароль
    и проверяет новый через стандартные AUTH_PASSWORD_VALIDATORS."""
    serializer = ChangePasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    user = request.user
    if not user.check_password(serializer.validated_data['old_password']):
        return Response({'old_password': ['Неверный текущий пароль']}, status=400)

    try:
        validate_password(serializer.validated_data['new_password'], user=user)
    except DjangoValidationError as exc:
        return Response({'new_password': exc.messages}, status=400)

    user.set_password(serializer.validated_data['new_password'])
    user.save(update_fields=['password'])
    return Response(status=204)
