from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from trees.views import FamilyTreeViewSet, PersonViewSet, RelationshipViewSet
from users.views import register, login

router = DefaultRouter()
router.register(r'trees', FamilyTreeViewSet, basename='tree')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/register/', register),
    path('api/auth/login/', login),
    path('api/', include(router.urls)),
    path('api/trees/<int:tree_id>/persons/', PersonViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('api/trees/<int:tree_id>/persons/<int:pk>/', PersonViewSet.as_view({
        'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy',
    })),
    path('api/trees/<int:tree_id>/relationships/', RelationshipViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('api/trees/<int:tree_id>/relationships/<int:pk>/', RelationshipViewSet.as_view({
        'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy',
    })),
]