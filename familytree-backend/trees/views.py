"""
Вьюсеты приложения trees: деревья, участники, персоны, связи, хронология жизни,
медиа-галерея и уведомления. Все эндпоинты защищены JWT-аутентификацией
(DEFAULT_AUTHENTICATION_CLASSES в config/settings.py) и системой ролей TreeMember.
"""

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, SAFE_METHODS
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from django.db import connection
from django.db.models import Count
from .models import FamilyTree, Person, Relationship, AuditLog, TreeMember, LifeEvent, Notification, Media
from .serializers import *
from .models import Invitation
from .permissions import IsTreeMember, IsTreeOwner, require_permission
import uuid
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail

MAX_ANCESTRY_DEPTH = 50  # защита от зацикливания на случай кривых данных (A — родитель B и B — родитель A)


def _fetch_ancestry_chain(tree, person, direction):
    """Обходит цепочку parent-связей одним рекурсивным SQL-запросом (WITH RECURSIVE),
    а не циклом в Python — иначе на каждое поколение уходил бы отдельный запрос.

    Args:
        tree: FamilyTree, в границах которого ищем связи (защита от утечки между деревьями).
        person: Person, от которого строится цепочка.
        direction: 'ancestors' — идти от person_to к person_from (вверх, к родителям),
            'descendants' — в обратную сторону (вниз, к детям).

    Returns:
        Список кортежей [(person_id, depth), ...], depth=1 — родитель/ребёнок,
        depth=2 — дед/внук и т.д. Глубина ограничена MAX_ANCESTRY_DEPTH.
    """
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


def _fetch_paternal_chain(tree, person):
    """Как _fetch_ancestry_chain(direction='ancestors'), но идёт только по отцовской линии:
    на каждом шаге берёт родителя с gender='M'. Нужно для «Жеті ата» — семи поколений
    предков строго по мужской линии. Требует заполненного Person.gender у предков —
    обрывается (не поднимается выше) на первом человеке без указанного пола или без
    известного отца, поэтому неполные данные дают укороченную, а не неверную цепочку.
    """
    rel_table = Relationship._meta.db_table
    person_table = Person._meta.db_table

    sql = f"""
        WITH RECURSIVE chain(person_id, depth) AS (
            SELECT r.person_from_id, 1
            FROM {rel_table} r
            JOIN {person_table} p ON p.id = r.person_from_id
            WHERE r.person_to_id = %s AND r.relationship_type = 'parent' AND r.tree_id = %s AND p.gender = 'M'

            UNION

            SELECT r.person_from_id, c.depth + 1
            FROM {rel_table} r
            JOIN {person_table} p ON p.id = r.person_from_id
            JOIN chain c ON r.person_to_id = c.person_id
            WHERE r.relationship_type = 'parent' AND r.tree_id = %s AND p.gender = 'M' AND c.depth < %s
        )
        SELECT person_id, MIN(depth) AS depth FROM chain GROUP BY person_id ORDER BY depth
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [person.id, tree.id, tree.id, MAX_ANCESTRY_DEPTH])
        return cursor.fetchall()


def _serialize_ancestry_chain(chain):
    """Превращает результат _fetch_ancestry_chain в JSON-совместимый список.

    Подтягивает все Person одним запросом (Person.objects.filter(id__in=...)),
    а не по одному в цикле, и добавляет каждому элементу поле depth.

    Args:
        chain: список (person_id, depth), как возвращает _fetch_ancestry_chain.

    Returns:
        Список словарей PersonSerializer.data + ключ 'depth', отсортированный по depth.
    """
    depth_by_id = dict(chain)
    persons = Person.objects.filter(id__in=depth_by_id.keys())
    data = PersonSerializer(persons, many=True).data
    for item in data:
        item['depth'] = depth_by_id[item['id']]
    data.sort(key=lambda item: item['depth'])
    return data


def log_audit(tree, user, action, content_type, object_id, changes=None):
    """Пишет запись в AuditLog для любого действия (create/update/delete) над любой
    сущностью дерева. Сигнал в signals.py сам разошлёт уведомления остальным участникам."""
    AuditLog.objects.create(
        tree=tree,
        user=user,
        action=action,
        content_type=content_type,
        object_id=object_id,
        changes=changes or {},
    )


def get_tree_role(tree, user):
    """Возвращает роль пользователя как реального участника дерева.

    Args:
        tree: FamilyTree, для которого проверяется членство.
        user: пользователь (обычно request.user).

    Returns:
        'owner' | 'editor' | 'reader', если пользователь состоит в TreeMember этого
        дерева, иначе None (в т.ч. для анонимного/незалогиненного пользователя).
    """
    membership = TreeMember.objects.filter(tree=tree, user=user).first()
    return membership.role if membership else None


def has_privacy_read_access(tree, request):
    """Проверяет, даёт ли privacy дерева доступ на чтение в обход членства.

    Работает только для безопасных методов (GET/HEAD/OPTIONS) — privacy никогда
    не даёт прав на запись, это исключительно про видимость данных.

    Args:
        tree: FamilyTree, чья privacy проверяется.
        request: текущий DRF-запрос (нужен метод и query-параметр share_token).

    Returns:
        True, если:
        - tree.privacy == 'public' (видно любому авторизованному пользователю), или
        - tree.privacy == 'link' и в запросе передан верный ?share_token=...
        Иначе False.
    """
    if request.method not in SAFE_METHODS:
        return False
    if tree.privacy == 'public':
        return True
    if tree.privacy == 'link' and request.query_params.get('share_token') == tree.share_token:
        return True
    return False


class FamilyTreeViewSet(viewsets.ModelViewSet):
    """CRUD для семейных деревьев + служебные действия (граф, история, инвайты).

    Стандартные REST-методы (list/retrieve/create/update/partial_update/destroy)
    подключены через DefaultRouter под префиксом /api/trees/.
    """
    serializer_class = FamilyTreeDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """Для списка деревьев отдаёт лёгкий сериализатор без вложенных persons/relationships.

        Без этого разделения GET /api/trees/ делал бы 2 лишних SQL-запроса на КАЖДОЕ
        дерево в списке (N+1) — полный граф отдельного дерева и так доступен через
        действие full_tree.
        """
        if self.action == 'list':
            return FamilyTreeListSerializer
        return FamilyTreeDetailSerializer

    def get_queryset(self):
        """Возвращает деревья, где текущий пользователь состоит участником
        (владелец/редактор/читатель) — это "мои деревья", а не общий каталог
        всех public-деревьев (для каталога см. действие public)."""
        if getattr(self, 'swagger_fake_view', False):
            # во время генерации OpenAPI-схемы request.user не настоящий пользователь
            return FamilyTree.objects.none()
        # id__in вместо filter(members__user=...), чтобы не столкнуть этот join с тем,
        # что использует annotate(Count('members')) ниже — иначе members_count считал бы
        # только "мою" строку членства, а не всех участников дерева
        my_tree_ids = TreeMember.objects.filter(user=self.request.user).values('tree_id')
        return (
            FamilyTree.objects.filter(id__in=my_tree_ids)
            .annotate(members_count=Count('members', distinct=True))
        )

    def _get_role(self, tree):
        """Короткая обёртка над get_tree_role для текущего пользователя запроса."""
        return get_tree_role(tree, self.request.user)

    def get_object(self):
        """Достаёт дерево по pk из URL с учётом privacy, а не только членства.

        В отличие от get_queryset (который используется для списка "моих деревьев"),
        сюда попадают и public/link-деревья, где пользователь не состоит участником —
        именно этот метод используется в retrieve/update/destroy/full_tree/audit_log/
        generate_invite, поэтому чтение публичных деревьев работает "из коробки".
        """
        tree = get_object_or_404(FamilyTree, id=self.kwargs.get('pk'))
        if self._get_role(tree) is None and not has_privacy_read_access(tree, self.request):
            raise PermissionDenied('Нет доступа к этому дереву')
        self.check_object_permissions(self.request, tree)
        return tree

    def perform_create(self, serializer):
        """Создаёт дерево и сразу делает создателя его владельцем (TreeMember role=owner)."""
        tree = serializer.save(owner=self.request.user)
        TreeMember.objects.create(tree=tree, user=self.request.user, role='owner')

    def update(self, request, *args, **kwargs):
        """Изменение настроек дерева (name/privacy) — доступно только владельцу."""
        tree = self.get_object()
        require_permission(IsTreeOwner(), request, self, tree)
        return super().update(request, *args, **kwargs)

    def perform_update(self, serializer):
        """Сохраняет изменения дерева (name/privacy) и пишет запись в AuditLog."""
        tree = serializer.save()
        log_audit(tree, self.request.user, 'update', 'FamilyTree', tree.id,
                   {'name': tree.name, 'privacy': tree.privacy})

    def destroy(self, request, *args, **kwargs):
        """Удаление дерева (каскадно тянет persons/relationships/логи и т.д.) — только владелец."""
        tree = self.get_object()
        require_permission(IsTreeOwner(), request, self, tree)
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def public(self, request):
        """Каталог открытых (privacy=public) деревьев — виден любому авторизованному
        пользователю независимо от членства. link-деревья сюда не попадают: по смыслу
        они доступны только по прямой ссылке с токеном, а не через общий список."""
        trees = (
            FamilyTree.objects.filter(privacy='public')
            .annotate(members_count=Count('members', distinct=True))
            .order_by('-created_at')
        )
        return Response(FamilyTreeListSerializer(trees, many=True).data)

    @action(detail=True, methods=['get'])
    def full_tree(self, request, pk=None):
        """Отдаёт весь граф дерева (все persons + все relationships) для отрисовки на фронтенде.

        Доступно участникам, а также читателям public/link-дерева — это учитывает
        get_object(). Иерархия (кто чей предок) на бэкенде здесь не строится,
        для этого есть отдельные ancestors/descendants у PersonViewSet.
        """
        tree = self.get_object()
        persons = tree.persons.all()
        relationships = tree.relationships.all()

        return Response({
            'persons': PersonSerializer(persons, many=True).data,
            'relationships': RelationshipSerializer(relationships, many=True).data,
        })

    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        """Хронология дерева: рождения, смерти и жизненные события (LifeEvent), одним
        списком по дате. Без параметров — вся семья; с ?person_id=&depth= — только
        прямые предки указанного человека (глубина в поколениях). ?line=paternal
        сужает до строго отцовской линии (нужен Person.gender='M' у предков) — для
        «Жеті ата» фронт шлёт person_id, depth=7, line=paternal.

        Доступ — как у full_tree (учитывает privacy дерева через get_object()); тип
        события/период/живые-умершие/наличие фото фильтруются уже на фронтенде —
        для дерева разумного размера (десятки-сотни персон) это дешевле лишнего
        параметра запроса и лишнего похода на бэкенд при каждом переключении фильтра.
        """
        tree = self.get_object()

        person_id = request.query_params.get('person_id')
        if person_id:
            anchor = get_object_or_404(Person, id=person_id, tree=tree)
            line = request.query_params.get('line', 'all')
            chain = _fetch_paternal_chain(tree, anchor) if line == 'paternal' else _fetch_ancestry_chain(tree, anchor, 'ancestors')
            depth_param = request.query_params.get('depth')
            if depth_param:
                try:
                    max_depth = int(depth_param)
                    chain = [(pid, d) for pid, d in chain if d <= max_depth]
                except ValueError:
                    pass
            person_ids = {anchor.id, *(pid for pid, _ in chain)}
            persons = Person.objects.filter(id__in=person_ids, tree=tree)
        else:
            persons = Person.objects.filter(tree=tree)

        def person_brief(p):
            return {
                'id': p.id,
                'first_name': p.first_name,
                'last_name': p.last_name,
                'patronymic': p.patronymic,
                'photo': p.photo.url if p.photo else None,
            }

        entries = []
        for p in persons:
            if p.birth_date:
                entries.append({'id': f'birth-{p.id}', 'type': 'birth', 'date': p.birth_date, 'person': person_brief(p)})
            if p.death_date:
                entries.append({'id': f'death-{p.id}', 'type': 'death', 'date': p.death_date, 'person': person_brief(p)})

        events = LifeEvent.objects.filter(person__in=persons, event_date__isnull=False).select_related('person')
        for e in events:
            entries.append({
                'id': f'event-{e.id}',
                'type': 'life_event',
                'date': e.event_date,
                'person': person_brief(e.person),
                'title': e.title,
                'description': e.description,
            })

        entries.sort(key=lambda item: item['date'])
        return Response(entries)

    @action(detail=True, methods=['get'])
    def audit_log(self, request, pk=None):
        """Последние 100 записей журнала изменений дерева.

        В отличие от full_tree, здесь privacy не даёт доступа — историю изменений
        видят только реальные участники (TreeMember), даже если дерево публичное.
        """
        tree = self.get_object()
        require_permission(IsTreeMember(), request, self, tree)
        logs = tree.audit_logs.all().order_by('-created_at')[:100]
        return Response(AuditLogSerializer(logs, many=True).data)

    @action(detail=True, methods=['post'])
    def generate_invite(self, request, pk=None):
        """Генерирует одноразовую инвайт-ссылку с заданной ролью (по умолчанию reader).

        Доступно только владельцу дерева. Инвайт живёт 30 дней и активируется через
        accept_invite; если передан email — дублируется письмом (send_mail).
        """
        tree = self.get_object()
        require_permission(IsTreeOwner(), request, self, tree)

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
        """Принимает инвайт по токену: создаёт/обновляет TreeMember текущего
        пользователя с ролью из инвайта и помечает инвайт использованным.

        Возвращает 400, если срок действия инвайта истёк.
        """
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

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Список участников дерева с ролями — видно только реальным участникам
        (в отличие от full_tree, приватность public/link сюда доступа не даёт)."""
        tree = self.get_object()
        require_permission(IsTreeMember(), request, self, tree)
        members = tree.members.select_related('user').order_by('created_at')
        return Response(TreeMemberSerializer(members, many=True).data)

    @action(detail=True, methods=['delete'], url_path='members/(?P<user_id>[^/.]+)')
    def remove_member(self, request, pk=None, user_id=None):
        """Убирает участника из дерева — только владелец; владелец не может убрать сам себя
        (иначе дерево осталось бы без единого владельца)."""
        tree = self.get_object()
        require_permission(IsTreeOwner(), request, self, tree)
        if str(request.user.id) == str(user_id):
            return Response({'error': 'Нельзя убрать самого себя из дерева'}, status=400)

        membership = get_object_or_404(TreeMember, tree=tree, user_id=user_id)
        removed_role = membership.role
        membership.delete()
        log_audit(tree, request.user, 'delete', 'TreeMember', int(user_id), {'role': removed_role})
        return Response(status=204)


class TreeScopedViewSet(viewsets.ModelViewSet):
    """Общая логика для вьюсетов, работающих внутри конкретного дерева
    (persons, relationships, life-events, media). tree_id берётся из URL-кваргов —
    эти вьюсеты подключены вручную через path(), а не через DefaultRouter."""
    permission_classes = [IsAuthenticated]

    def get_tree_and_role(self):
        """Достаёт дерево по tree_id из URL и роль текущего пользователя в нём.

        Returns:
            Кортеж (tree, role), где role — 'owner'/'editor'/'reader' для реального
            участника, либо None для read-доступа по privacy (public/link).

        Raises:
            PermissionDenied, если пользователь не участник и privacy не даёт
            доступа на чтение (см. has_privacy_read_access).
        """
        tree_id = self.kwargs.get('tree_id')
        tree = get_object_or_404(FamilyTree, id=tree_id)
        role = get_tree_role(tree, self.request.user)
        if role is None and not has_privacy_read_access(tree, self.request):
            raise PermissionDenied('Нет доступа к этому дереву')
        return tree, role

    def check_can_edit(self, role):
        """Разрешает изменение данных только owner/editor.

        role=None означает читателя по privacy (public/link), не участника дерева —
        ему, как и role='reader', писать нельзя.
        """
        if role not in ('owner', 'editor'):
            raise PermissionDenied('Недостаточно прав для изменения данных')


class PersonViewSet(TreeScopedViewSet):
    """CRUD для персон конкретного дерева + вычисление предков/потомков.

    Подключён вручную под /api/trees/<tree_id>/persons/ (см. config/urls.py).
    """
    serializer_class = PersonSerializer

    def get_queryset(self):
        """Все персоны дерева из URL, доступного текущему пользователю."""
        tree, _ = self.get_tree_and_role()
        return Person.objects.filter(tree=tree)

    def perform_create(self, serializer):
        """Создаёт персону, привязывает автора (created_by) и пишет запись в AuditLog
        (на неё автоматически среагирует сигнал в signals.py и разошлёт уведомления)."""
        tree, role = self.get_tree_and_role()
        self.check_can_edit(role)

        person = serializer.save(tree=tree, created_by=self.request.user)
        log_audit(tree, self.request.user, 'create', 'Person', person.id,
                   {'created': PersonSerializer(person).data})

    def perform_update(self, serializer):
        """Обновление персоны — только для owner/editor дерева, пишется в AuditLog."""
        tree, role = self.get_tree_and_role()
        self.check_can_edit(role)
        person = serializer.save()
        log_audit(tree, self.request.user, 'update', 'Person', person.id,
                   {'updated': PersonSerializer(person).data})

    def perform_destroy(self, instance):
        """Удаление персоны — только для owner/editor дерева, пишется в AuditLog."""
        tree, role = self.get_tree_and_role()
        self.check_can_edit(role)
        object_id, snapshot = instance.id, PersonSerializer(instance).data
        instance.delete()
        log_audit(tree, self.request.user, 'delete', 'Person', object_id, {'deleted': snapshot})

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
    оставался лёгким и не тянул события/вложения для каждого узла заранее
    (ленивая загрузка, п. 3.1 ТЗ)."""
    serializer_class = LifeEventSerializer

    def get_person(self, tree):
        """Достаёт персону по person_id из URL, проверяя, что она принадлежит дереву."""
        return get_object_or_404(Person, id=self.kwargs.get('person_id'), tree=tree)

    def get_queryset(self):
        """Все события жизни конкретной персоны."""
        tree, _ = self.get_tree_and_role()
        person = self.get_person(tree)
        return LifeEvent.objects.filter(person=person)

    def perform_create(self, serializer):
        """Создаёт событие и привязывает автора — только для owner/editor дерева."""
        tree, role = self.get_tree_and_role()
        self.check_can_edit(role)
        person = self.get_person(tree)
        event = serializer.save(person=person, created_by=self.request.user)
        log_audit(tree, self.request.user, 'create', 'LifeEvent', event.id,
                   {'created': LifeEventSerializer(event).data})

    def perform_update(self, serializer):
        """Обновление события — только для owner/editor дерева, пишется в AuditLog."""
        tree, role = self.get_tree_and_role()
        self.check_can_edit(role)
        event = serializer.save()
        log_audit(tree, self.request.user, 'update', 'LifeEvent', event.id,
                   {'updated': LifeEventSerializer(event).data})

    def perform_destroy(self, instance):
        """Удаление события — только для owner/editor дерева, пишется в AuditLog."""
        tree, role = self.get_tree_and_role()
        self.check_can_edit(role)
        object_id, snapshot = instance.id, LifeEventSerializer(instance).data
        instance.delete()
        log_audit(tree, self.request.user, 'delete', 'LifeEvent', object_id, {'deleted': snapshot})


class MediaViewSet(TreeScopedViewSet):
    """Общая галерея архивных фото/сканов персоны, не привязанных к конкретному LifeEvent
    (в отличие от Person.photo — единственного основного фото). Как и life-events,
    отдельный ленивый эндпоинт, не тянется в full_tree (п. 3.1 ТЗ)."""
    serializer_class = MediaSerializer

    def get_person(self, tree):
        """Достаёт персону по person_id из URL, проверяя, что она принадлежит дереву."""
        return get_object_or_404(Person, id=self.kwargs.get('person_id'), tree=tree)

    def get_queryset(self):
        """Все файлы галереи конкретной персоны."""
        tree, _ = self.get_tree_and_role()
        person = self.get_person(tree)
        return Media.objects.filter(person=person)

    def perform_create(self, serializer):
        """Загружает файл в галерею и привязывает автора — только для owner/editor дерева."""
        tree, role = self.get_tree_and_role()
        self.check_can_edit(role)
        person = self.get_person(tree)
        media = serializer.save(person=person, created_by=self.request.user)
        log_audit(tree, self.request.user, 'create', 'Media', media.id,
                   {'created': {'caption': media.caption}})

    def perform_update(self, serializer):
        """Обновление подписи/файла — только для owner/editor дерева, пишется в AuditLog."""
        tree, role = self.get_tree_and_role()
        self.check_can_edit(role)
        media = serializer.save()
        log_audit(tree, self.request.user, 'update', 'Media', media.id,
                   {'updated': {'caption': media.caption}})

    def perform_destroy(self, instance):
        """Удаление файла из галереи — только для owner/editor дерева, пишется в AuditLog."""
        tree, role = self.get_tree_and_role()
        self.check_can_edit(role)
        object_id, caption = instance.id, instance.caption
        instance.delete()
        log_audit(tree, self.request.user, 'delete', 'Media', object_id, {'deleted': {'caption': caption}})


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """Уведомления пользователя обо всех деревьях сразу (не привязано к tree_id в URL) —
    создаются автоматически сигналом на AuditLog, см. trees/signals.py.
    Только чтение + два действия для пометки прочитанным (сама модель не редактируется
    напрямую через API)."""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Уведомления текущего пользователя, свежие сверху.

        Поддерживает query-параметр ?unread=true для фильтрации только непрочитанных.
        select_related('tree', 'audit_log') — чтобы не получить N+1 при сериализации
        вложенного audit_log и tree_name на каждую строку списка.
        """
        if getattr(self, 'swagger_fake_view', False):
            return Notification.objects.none()
        qs = Notification.objects.filter(user=self.request.user).select_related('tree', 'audit_log')
        if self.request.query_params.get('unread') == 'true':
            qs = qs.filter(is_read=False)
        return qs

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Помечает одно уведомление прочитанным."""
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Помечает прочитанными все непрочитанные уведомления пользователя разом.
        Возвращает количество затронутых записей."""
        updated = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'marked_read': updated})


class RelationshipViewSet(TreeScopedViewSet):
    """CRUD для связей между персонами конкретного дерева
    (parent/child/spouse/sibling — направленное ребро person_from -> person_to)."""
    serializer_class = RelationshipSerializer

    def get_queryset(self):
        """Все связи дерева из URL, доступного текущему пользователю."""
        tree, _ = self.get_tree_and_role()
        return Relationship.objects.filter(tree=tree)

    def _check_same_tree(self, tree, serializer):
        """Защита от кросс-тенантной связи: person_from/person_to должны принадлежать
        тому же дереву, что и URL, а не просто существовать в базе."""
        person_from = serializer.validated_data.get('person_from')
        person_to = serializer.validated_data.get('person_to')
        for person in (person_from, person_to):
            if person is not None and person.tree_id != tree.id:
                raise PermissionDenied('Человек принадлежит другому дереву')

    def perform_create(self, serializer):
        """Создаёт связь — только для owner/editor дерева."""
        tree, role = self.get_tree_and_role()
        self.check_can_edit(role)
        self._check_same_tree(tree, serializer)
        relationship = serializer.save(tree=tree)
        log_audit(tree, self.request.user, 'create', 'Relationship', relationship.id,
                   {'created': RelationshipSerializer(relationship).data})

    def perform_update(self, serializer):
        """Обновление связи — только для owner/editor дерева, пишется в AuditLog."""
        tree, role = self.get_tree_and_role()
        self.check_can_edit(role)
        self._check_same_tree(tree, serializer)
        relationship = serializer.save()
        log_audit(tree, self.request.user, 'update', 'Relationship', relationship.id,
                   {'updated': RelationshipSerializer(relationship).data})

    def perform_destroy(self, instance):
        """Удаление связи — только для owner/editor дерева, пишется в AuditLog."""
        tree, role = self.get_tree_and_role()
        self.check_can_edit(role)
        object_id, snapshot = instance.id, RelationshipSerializer(instance).data
        instance.delete()
        log_audit(tree, self.request.user, 'delete', 'Relationship', object_id, {'deleted': snapshot})
