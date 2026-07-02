from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, SAFE_METHODS
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from django.db import connection
from .models import FamilyTree, Person, Relationship, AuditLog, TreeMember, LifeEvent
from .serializers import *
from .models import Invitation
import uuid
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail

MAX_ANCESTRY_DEPTH = 50  # защита от зацикливания на случай кривых данных (A — родитель B и B — родитель A)

def _fetch_ancestry_chain(tree, person, direction):
    """Обходит цепочку parent-связей одним рекурсивным SQL-запросом (WITH RECURSIVE),
    а не циклом в Python — иначе на каждое поколение уходил бы отдельный запрос.
    direction: 'ancestors' — идти от person_to к person_from, 'descendants' — наоборот.
    Возвращает [(person_id, depth), ...], depth=1 — родитель/ребёнок, depth=2 — дед/внук и т.д."""
    table = Relationship._meta.db_table
    if direction == 'ancestors':
        start_col, next_col = 'person_to_id', 'person_from_id'
    else:
        start_col, next_col = 'person_from_id', 'person_to_id'

    sql = f"""
        WITH RECURSIVE chain(person_id, depth) AS (
            SELECT {next_col}, 1
            FROM {table}
            WHERE {start_col} = %s AND relationship_type = 'parent' AND tree_id = %s

            UNION

            SELECT r.{next_col}, c.depth + 1
            FROM {table} r
            JOIN chain c ON r.{start_col} = c.person_id
            WHERE r.relationship_type = 'parent' AND r.tree_id = %s AND c.depth < %s
        )
        SELECT person_id, MIN(depth) AS depth FROM chain GROUP BY person_id ORDER BY depth
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [person.id, tree.id, tree.id, MAX_ANCESTRY_DEPTH])
        return cursor.fetchall()

def _serialize_ancestry_chain(chain):
    """chain -> список persons (одним запросом Person.objects.filter(id__in=...)) с добавленным полем depth."""
    depth_by_id = dict(chain)
    persons = Person.objects.filter(id__in=depth_by_id.keys())
    data = PersonSerializer(persons, many=True).data
    for item in data:
        item['depth'] = depth_by_id[item['id']]
    data.sort(key=lambda item: item['depth'])
    return data

def get_tree_role(tree, user):
    """Роль пользователя как реального участника дерева (owner/editor/reader), либо None."""
    membership = TreeMember.objects.filter(tree=tree, user=user).first()
    return membership.role if membership else None

def has_privacy_read_access(tree, request):
    """Доступ на чтение в обход членства — согласно privacy дерева.
    Работает только для безопасных (GET/HEAD/OPTIONS) методов: privacy не даёт прав на запись."""
    if request.method not in SAFE_METHODS:
        return False
    if tree.privacy == 'public':
        return True
    if tree.privacy == 'link' and request.query_params.get('share_token') == tree.share_token:
        return True
    return False

class FamilyTreeViewSet(viewsets.ModelViewSet):
    serializer_class = FamilyTreeDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        # список деревьев не должен тянуть persons/relationships на каждое дерево (N+1) —
        # для этого есть отдельный эндпоинт full_tree
        if self.action == 'list':
            return FamilyTreeListSerializer
        return FamilyTreeDetailSerializer

    def get_queryset(self):
        # деревья, где пользователь состоит участником (владелец/редактор/читатель) —
        # это "мои деревья", а не общий каталог всех public-деревьев
        return FamilyTree.objects.filter(members__user=self.request.user).distinct()

    def _get_role(self, tree):
        return get_tree_role(tree, self.request.user)

    def get_object(self):
        # шире, чем get_queryset: сюда же попадают public/link-деревья, где пользователь не участник
        tree = get_object_or_404(FamilyTree, id=self.kwargs.get('pk'))
        if self._get_role(tree) is None and not has_privacy_read_access(tree, self.request):
            raise PermissionDenied('Нет доступа к этому дереву')
        self.check_object_permissions(self.request, tree)
        return tree

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
        """API эндпоинт: получить всё дерево для фронтенда (граф).
        Доступно участникам, а также читателям public/link-дерева (get_object это учитывает)."""
        tree = self.get_object()
        persons = tree.persons.all()
        relationships = tree.relationships.all()

        return Response({
            'persons': PersonSerializer(persons, many=True).data,
            'relationships': RelationshipSerializer(relationships, many=True).data,
        })

    @action(detail=True, methods=['get'])
    def audit_log(self, request, pk=None):
        """История изменений — только для реальных участников дерева,
        publiс/link-читателям без членства она не показывается."""
        tree = self.get_object()
        if self._get_role(tree) is None:
            raise PermissionDenied('История изменений доступна только участникам дерева')
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
    """Общая логика для вьюсетов, работающих внутри конкретного дерева (persons, relationships, life-events)."""
    permission_classes = [IsAuthenticated]

    def get_tree_and_role(self):
        tree_id = self.kwargs.get('tree_id')
        tree = get_object_or_404(FamilyTree, id=tree_id)
        role = get_tree_role(tree, self.request.user)
        if role is None and not has_privacy_read_access(tree, self.request):
            raise PermissionDenied('Нет доступа к этому дереву')
        return tree, role

    def check_can_edit(self, role):
        # role=None — это читатель по privacy (public/link), не участник дерева;
        # ему, как и role='reader', писать нельзя
        if role not in ('owner', 'editor'):
            raise PermissionDenied('Недостаточно прав для изменения данных')

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

    @action(detail=True, methods=['get'])
    def ancestors(self, request, tree_id=None, pk=None):
        """Родители, деды, прадеды... через рекурсивный CTE (п. 3.1 ТЗ), одним SQL-запросом
        независимо от глубины дерева."""
        tree, _ = self.get_tree_and_role()
        person = get_object_or_404(Person, id=pk, tree=tree)
        chain = _fetch_ancestry_chain(tree, person, 'ancestors')
        return Response(_serialize_ancestry_chain(chain))

    @action(detail=True, methods=['get'])
    def descendants(self, request, tree_id=None, pk=None):
        """Дети, внуки, правнуки... — та же логика, но по рёбрам в обратную сторону."""
        tree, _ = self.get_tree_and_role()
        person = get_object_or_404(Person, id=pk, tree=tree)
        chain = _fetch_ancestry_chain(tree, person, 'descendants')
        return Response(_serialize_ancestry_chain(chain))

class LifeEventViewSet(TreeScopedViewSet):
    """Хронология жизни персоны — отдельный эндпоинт, чтобы full_tree (граф)
    оставался лёгким и не тянул события/вложения для каждого узла заранее."""
    serializer_class = LifeEventSerializer

    def get_person(self, tree):
        return get_object_or_404(Person, id=self.kwargs.get('person_id'), tree=tree)

    def get_queryset(self):
        tree, _ = self.get_tree_and_role()
        person = self.get_person(tree)
        return LifeEvent.objects.filter(person=person)

    def perform_create(self, serializer):
        tree, role = self.get_tree_and_role()
        self.check_can_edit(role)
        person = self.get_person(tree)
        serializer.save(person=person, created_by=self.request.user)

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
