"""
Корневая маршрутизация проекта.

- /admin/ — стандартная Django-админка.
- /api/schema/, /api/docs/, /api/redoc/ — OpenAPI-схема и Swagger/Redoc UI (drf-spectacular).
- /api/auth/... — регистрация и логин (JWT).
- /api/trees/... — FamilyTreeViewSet и NotificationViewSet подключены через DefaultRouter
  (стандартный CRUD + @action-эндпоинты вроде full_tree, public, mark_read).
- /api/trees/<tree_id>/persons/..., .../relationships/..., .../life-events/..., .../media/...
  подключены вручную через path(), а не через роутер — эти вьюсеты (TreeScopedViewSet)
  работают в контексте конкретного дерева (tree_id берётся из URL, а не из queryset).
- /media/... — раздача загруженных файлов, работает независимо от DEBUG (временное решение
  до объектного хранилища из ТЗ). /dev/ — мини-консоль, доступна только при DEBUG=True.
"""
from django.conf import settings
from django.contrib import admin
from django.http import HttpResponse
from django.urls import path, include, re_path
from django.views.static import serve as serve_media
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from rest_framework_simplejwt.views import TokenRefreshView
from trees.views import (
    FamilyTreeViewSet, PersonViewSet, RelationshipViewSet, LifeEventViewSet, NotificationViewSet, MediaViewSet,
)
from users.views import register, login, logout, profile, change_password
from core.views import dev_console

router = DefaultRouter()
router.register(r'trees', FamilyTreeViewSet, basename='tree')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    # Health-check для Render/докера — без БД и без drf-spectacular (генерация OpenAPI-схемы
    # на /api/schema/ слишком медленная на бесплатном 0.1 CPU и роняла health-check по таймауту).
    path('healthz/', lambda request: HttpResponse('ok')),

    path('admin/', admin.site.urls),

    # OpenAPI-схема и её визуализация (Swagger UI / Redoc)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    path('api/auth/register/', register),
    path('api/auth/login/', login),
    # обновление access-токена по refresh-токену (POST {"refresh": "..."} -> {"access": "..."})
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # отзыв refresh-токена (POST {"refresh": "..."} -> 204)
    path('api/auth/logout/', logout, name='token_logout'),
    path('api/auth/me/', profile, name='user_profile'),
    path('api/auth/change-password/', change_password, name='change_password'),
    path('api/', include(router.urls)),
    path('api/trees/<int:tree_id>/persons/', PersonViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('api/trees/<int:tree_id>/persons/<int:pk>/', PersonViewSet.as_view({
        'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy',
    })),
    path('api/trees/<int:tree_id>/persons/<int:pk>/ancestors/', PersonViewSet.as_view({'get': 'ancestors'})),
    path('api/trees/<int:tree_id>/persons/<int:pk>/descendants/', PersonViewSet.as_view({'get': 'descendants'})),
    path('api/trees/<int:tree_id>/relationships/', RelationshipViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('api/trees/<int:tree_id>/relationships/<int:pk>/', RelationshipViewSet.as_view({
        'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy',
    })),
    path('api/trees/<int:tree_id>/persons/<int:person_id>/life-events/', LifeEventViewSet.as_view({
        'get': 'list', 'post': 'create',
    })),
    path('api/trees/<int:tree_id>/persons/<int:person_id>/life-events/<int:pk>/', LifeEventViewSet.as_view({
        'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy',
    })),
    path('api/trees/<int:tree_id>/persons/<int:person_id>/media/', MediaViewSet.as_view({
        'get': 'list', 'post': 'create',
    })),
    path('api/trees/<int:tree_id>/persons/<int:person_id>/media/<int:pk>/', MediaViewSet.as_view({
        'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy',
    })),

    # Раздача загруженных файлов (person.photo, LifeEvent.attachment, Media.file) — специально
    # НЕ через django.conf.urls.static.static(), потому что тот работает только при DEBUG=True
    # и молча отключается в проде, из-за чего все фото/сканы переставали открываться. До появления
    # настоящего объектного хранилища (S3, presigned URL — п.4 ТЗ) отдаём файлы напрямую всегда;
    # это не проверяет приватность/роли дерева и не годится под нагрузку — временное решение.
    re_path(r'^media/(?P<path>.*)$', serve_media, {'document_root': settings.MEDIA_ROOT}),
]

if settings.DEBUG:
    # мини-консоль для ручного тестирования API без фронтенда — только для локальной разработки
    urlpatterns += [path('dev/', dev_console)]