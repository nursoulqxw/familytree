from rest_framework import serializers
from .models import Person, Relationship, FamilyTree, AuditLog, LifeEvent, Notification, Media

class PersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = ['id', 'first_name', 'last_name', 'birth_date', 'death_date', 'bio', 'photo', 'extra_data']

class LifeEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = LifeEvent
        fields = ['id', 'title', 'description', 'event_date', 'attachment', 'created_at']

class MediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Media
        fields = ['id', 'file', 'caption', 'created_at']

class RelationshipSerializer(serializers.ModelSerializer):
    class Meta:
        model = Relationship
        fields = ['id', 'person_from', 'person_to', 'relationship_type']

class FamilyTreeListSerializer(serializers.ModelSerializer):
    """Лёгкий сериализатор для списка деревьев — без persons/relationships.
    Полный граф отдаёт отдельный эндпоинт full_tree (лениво, по запросу для одного дерева),
    иначе список из N деревьев стоил бы 2*N лишних SQL-запросов (N+1)."""
    class Meta:
        model = FamilyTree
        fields = ['id', 'name', 'privacy', 'share_token']
        read_only_fields = ['share_token']

class FamilyTreeDetailSerializer(serializers.ModelSerializer):
    persons = PersonSerializer(many=True, read_only=True)
    relationships = RelationshipSerializer(many=True, read_only=True)

    class Meta:
        model = FamilyTree
        fields = ['id', 'name', 'privacy', 'share_token', 'persons', 'relationships']
        read_only_fields = ['share_token']

class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'action', 'content_type', 'changes', 'created_at']

class NotificationSerializer(serializers.ModelSerializer):
    audit_log = AuditLogSerializer(read_only=True)
    tree_name = serializers.CharField(source='tree.name', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'tree', 'tree_name', 'audit_log', 'is_read', 'created_at']