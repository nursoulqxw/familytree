"""Формальные DRF permission-классы для действий над деревом. Раньше owner/member-проверки
были россыпью одинаковых `if role != 'owner': return Response(..., status=403)` в каждом
действии — здесь та же логика, но переиспользуемая и проверяемая через check_object_permissions."""
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission

from .models import TreeMember


def require_permission(permission, request, view, obj):
    """Аналог self.check_object_permissions(), но для одного конкретного permission-класса,
    а не всего self.permission_classes вьюсета — действия вроде update()/generate_invite()
    внутри одного ViewSet требуют разных ролей (owner для одних, любой участник для других)."""
    if not permission.has_object_permission(request, view, obj):
        raise PermissionDenied(getattr(permission, 'message', None))


def _tree_of(obj):
    """Действия FamilyTreeViewSet передают сюда сам FamilyTree, а действия
    TreeScopedViewSet — иногда объект с полем .tree; поддерживаем оба случая."""
    return obj if type(obj).__name__ == 'FamilyTree' else getattr(obj, 'tree', obj)


class IsTreeMember(BasePermission):
    """Пользователь состоит в дереве в любой роли (owner/editor/reader)."""
    message = 'Вы не участник этого дерева'

    def has_object_permission(self, request, view, obj):
        tree = _tree_of(obj)
        return TreeMember.objects.filter(tree=tree, user=request.user).exists()


class IsTreeOwner(BasePermission):
    """Пользователь — владелец дерева (единственная роль, которой доверяются
    необратимые/административные действия: изменение настроек, удаление дерева,
    приглашения, управление участниками)."""
    message = 'Действие доступно только владельцу дерева'

    def has_object_permission(self, request, view, obj):
        tree = _tree_of(obj)
        return TreeMember.objects.filter(tree=tree, user=request.user, role='owner').exists()
