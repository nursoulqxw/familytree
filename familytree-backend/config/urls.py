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
- /media/... и /dev/ — только при DEBUG=True (раздача файлов и dev-консоль).
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from rest_framework_simplejwt.views import TokenRefreshView
from trees.views import (
    FamilyTreeViewSet, PersonViewSet, RelationshipViewSet, LifeEventViewSet, NotificationViewSet, MediaViewSet,
)
from users.views import register, login
from core.views import dev_console

router = DefaultRouter()
router.register(r'trees', FamilyTreeViewSet, basename='tree')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('admin/', admin.site.urls),

    # OpenAPI-схема и её визуализация (Swagger UI / Redoc)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    path('api/auth/register/', register),
    path('api/auth/login/', login),
    # обновление access-токена по refresh-токену (POST {"refresh": "..."} -> {"access": "..."})
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
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
]

if settings.DEBUG:
    # только для локальной разработки без S3 — прямые URL медиафайлов не проверяют
    # приватность/роли дерева, в проде (объектное хранилище из ТЗ) это должно идти через presigned URL
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # мини-консоль для ручного тестирования API без фронтенда
    urlpatterns += [path('dev/', dev_console)]