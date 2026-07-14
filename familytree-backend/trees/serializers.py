"""Сериализаторы приложения trees — форма JSON, которую отдают/принимают эндпоинты API."""
from rest_framework import serializers
from .models import Person, Relationship, FamilyTree, AuditLog, LifeEvent, Notification, Media, TreeMember


class PersonSerializer(serializers.ModelSerializer):
    """Персона в дереве. Используется и как основной CRUD-сериализатор
    (PersonViewSet), и как компактное представление внутри full_tree/ancestors."""
    class Meta:
        model = Person
        fields = [
            'id', 'first_name', 'last_name', 'patronymic', 'gender',
            'birth_date', 'death_date', 'birth_place', 'bio', 'photo', 'extra_data',
        ]

    def validate(self, attrs):
        """Дата смерти не может быть раньше даты рождения (п. 3.1 ТЗ).

        Берёт значения из attrs, а для partial_update — из текущего instance,
        если поле не прислали в этом запросе.
        """
        birth_date = attrs.get('birth_date', getattr(self.instance, 'birth_date', None))
        death_date = attrs.get('death_date', getattr(self.instance, 'death_date', None))
        if birth_date and death_date and death_date < birth_date:
            raise serializers.ValidationError(
                {'death_date': 'Дата смерти не может быть раньше даты рождения'}
            )
        return attrs


class LifeEventSerializer(serializers.ModelSerializer):
    """Одно событие хронологии жизни персоны (LifeEventViewSet)."""
    class Meta:
        model = LifeEvent
        fields = ['id', 'title', 'description', 'event_date', 'attachment', 'created_at']


class MediaSerializer(serializers.ModelSerializer):
    """Один файл общей медиа-галереи персоны (MediaViewSet)."""
    class Meta:
        model = Media
        fields = ['id', 'file', 'caption', 'created_at']


class RelationshipSerializer(serializers.ModelSerializer):
    """Связь между двумя персонами. person_from/person_to сериализуются как
    обычные PrimaryKeyRelatedField — DRF отдаёт их без лишнего SQL-запроса
    на каждую строку (см. PKOnlyObject-оптимизацию в самом DRF)."""
    class Meta:
        model = Relationship
        fields = ['id', 'person_from', 'person_to', 'relationship_type']

    def validate(self, attrs):
        """Запрещает самосвязь: person_from и person_to не могут быть одним и тем же человеком."""
        person_from = attrs.get('person_from', getattr(self.instance, 'person_from', None))
        person_to = attrs.get('person_to', getattr(self.instance, 'person_to', None))

        if person_from and person_to and person_from.id == person_to.id:
            raise serializers.ValidationError(
                {'person_to': 'Нельзя создать связь человека с самим собой'}
            )

        return attrs


class MembersCountMixin(serializers.Serializer):
    """Отдаёт число участников дерева. Если queryset уже аннотирован
    (.annotate(members_count=Count('members', distinct=True)) — см. FamilyTreeViewSet),
    берёт готовое значение без лишнего запроса; иначе (retrieve одного дерева) —
    один запрос на этот единственный объект, не N+1."""
    members_count = serializers.SerializerMethodField()

    def get_members_count(self, obj):
        if hasattr(obj, 'members_count'):
            return obj.members_count
        return obj.members.count()


class FamilyTreeListSerializer(MembersCountMixin, serializers.ModelSerializer):
    """Лёгкий сериализатор для списка деревьев — без persons/relationships.
    Полный граф отдаёт отдельный эндпоинт full_tree (лениво, по запросу для одного дерева),
    иначе список из N деревьев стоил бы 2*N лишних SQL-запросов (N+1)."""
    class Meta:
        model = FamilyTree
        fields = ['id', 'name', 'privacy', 'share_token', 'members_count']
        read_only_fields = ['share_token']


class FamilyTreeDetailSerializer(MembersCountMixin, serializers.ModelSerializer):
    """Полное представление дерева с вложенными persons/relationships.
    Используется для retrieve/create/update одного конкретного дерева —
    для списка деревьев см. более лёгкий FamilyTreeListSerializer."""
    persons = PersonSerializer(many=True, read_only=True)
    relationships = RelationshipSerializer(many=True, read_only=True)

    class Meta:
        model = FamilyTree
        fields = ['id', 'name', 'privacy', 'share_token', 'members_count', 'persons', 'relationships']
        read_only_fields = ['share_token']


class TreeMemberSerializer(serializers.ModelSerializer):
    """Один участник дерева со своей ролью — для GET .../members/."""
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = TreeMember
        fields = ['user_id', 'username', 'email', 'role', 'created_at']


class AuditLogSerializer(serializers.ModelSerializer):
    """Одна запись журнала изменений дерева (кто/что/когда поменял)."""
    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'action', 'content_type', 'changes', 'created_at']


class NotificationSerializer(serializers.ModelSerializer):
    """Уведомление пользователя. Вкладывает полный AuditLogSerializer, чтобы
    получатель сразу видел, что именно изменилось, без второго запроса."""
    audit_log = AuditLogSerializer(read_only=True)
    tree_name = serializers.CharField(source='tree.name', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'tree', 'tree_name', 'audit_log', 'is_read', 'created_at']
