from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
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
    path('api/auth/register/', register),
    path('api/auth/login/', login),
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