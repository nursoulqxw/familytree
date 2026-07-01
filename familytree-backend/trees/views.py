from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from .models import FamilyTree, Person, Relationship, AuditLog, TreeMember
from .serializers import *
from .models import Invitation
import uuid
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail

class FamilyTreeViewSet(viewsets.ModelViewSet):
    serializer_class = FamilyTreeDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # деревья, где пользователь состоит участником (владелец/редактор/читатель)
        return FamilyTree.objects.filter(members__user=self.request.user).distinct()

    def _get_role(self, tree):
        membership = TreeMember.objects.filter(tree=tree, user=self.request.user).first()
        return membership.role if membership else None

    def perform_create(self, serializer):
        tree = serializer.save(owner=self.request.user)
        TreeMember.objects.create(tree=tree, user=self.request.user, role='owner')

    def update(self, request, *args, **kwargs):
        tree = self.get_object()
        if self._get_role(tree) != 'owner':
            return Response({'error': 'Только владелец может изменять настройки дерева'}, status=403)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        tree = self.get_object()
        if self._get_role(tree) != 'owner':
            return Response({'error': 'Только владелец может удалить дерево'}, status=403)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def full_tree(self, request, pk=None):
        """API эндпоинт: получить всё дерево для фронтенда (граф)"""
        tree = self.get_object()
        persons = tree.persons.all()
        relationships = tree.relationships.all()

        return Response({
            'persons': PersonSerializer(persons, many=True).data,
            'relationships': RelationshipSerializer(relationships, many=True).data,
        })

    @action(detail=True, methods=['get'])
    def audit_log(self, request, pk=None):
        """История изменений"""
        tree = self.get_object()
        logs = tree.audit_logs.all().order_by('-created_at')[:100]
        return Response(AuditLogSerializer(logs, many=True).data)

    @action(detail=True, methods=['post'])
    def generate_invite(self, request, pk=None):
        """Генерировать инвайт-ссылку"""
        tree = self.get_object()

        if self._get_role(tree) != 'owner':
            return Response({'error': 'Только владелец может приглашать участников'}, status=403)

        token = str(uuid.uuid4())
        role = request.data.get('role', 'reader')
        email = request.data.get('email', '')

        invitation = Invitation.objects.create(
            tree=tree,
            token=token,
            role=role,
            email=email,
            expires_at=timezone.now() + timedelta(days=30)
        )

        invite_link = f"https://yourdomain.com/accept-invite/{token}"

        # отправка email (опционально)
        if email:
            send_mail(
                f"Приглашение в семейное дерево {tree.name}",
                f"Присоединитесь: {invite_link}",
                'noreply@familytree.com',
                [email],
            )

        return Response({
            'token': token,
            'link': invite_link,
            'expires_at': invitation.expires_at,
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def accept_invite(self, request):
        """Принять инвайт и добавиться в дерево"""
        token = request.data.get('token')
        invitation = get_object_or_404(Invitation, token=token, used=False)

        if timezone.now() > invitation.expires_at:
            return Response({'error': 'Инвайт истёк'}, status=400)

        TreeMember.objects.update_or_create(
            tree=invitation.tree,
            user=request.user,
            defaults={'role': invitation.role},
        )

        invitation.used = True
        invitation.save()

        return Response({
            'message': 'Вы присоединились',
            'tree_id': invitation.tree_id,
            'role': invitation.role,
        })

class TreeScopedViewSet(viewsets.ModelViewSet):
    """Общая логика для вьюсетов, работающих внутри конкретного дерева (persons, relationships)."""
    permission_classes = [IsAuthenticated]

    def get_tree_and_role(self):
        tree_id = self.kwargs.get('tree_id')
        tree = get_object_or_404(FamilyTree, id=tree_id)
        membership = TreeMember.objects.filter(tree=tree, user=self.request.user).first()
        if not membership:
            raise PermissionDenied('Нет доступа к этому дереву')
        return tree, membership.role

    def check_can_edit(self, role):
        if role == 'reader':
            raise PermissionDenied('Читатель не может изменять данные')

class PersonViewSet(TreeScopedViewSet):
    serializer_class = PersonSerializer

    def get_queryset(self):
        tree, _ = self.get_tree_and_role()
        return Person.objects.filter(tree=tree)

    def perform_create(self, serializer):
        tree, role = self.get_tree_and_role()
        self.check_can_edit(role)

        person = serializer.save(tree=tree, created_by=self.request.user)

        AuditLog.objects.create(
            tree=tree,
            user=self.request.user,
            action='create',
            content_type='Person',
            object_id=person.id,
            changes={'created': PersonSerializer(person).data}
        )

    def perform_update(self, serializer):
        tree, role = self.get_tree_and_role()
        self.check_can_edit(role)
        serializer.save()

    def perform_destroy(self, instance):
        tree, role = self.get_tree_and_role()
        self.check_can_edit(role)
        instance.delete()

class RelationshipViewSet(TreeScopedViewSet):
    serializer_class = RelationshipSerializer

    def get_queryset(self):
        tree, _ = self.get_tree_and_role()
        return Relationship.objects.filter(tree=tree)

    def perform_create(self, serializer):
        tree, role = self.get_tree_and_role()
        self.check_can_edit(role)
        serializer.save(tree=tree)

    def perform_update(self, serializer):
        tree, role = self.get_tree_and_role()
        self.check_can_edit(role)
        serializer.save()

    def perform_destroy(self, instance):
        tree, role = self.get_tree_and_role()
        self.check_can_edit(role)
        instance.delete()
