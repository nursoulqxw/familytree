from rest_framework import serializers
from .models import Person, Relationship, FamilyTree, AuditLog, LifeEvent

class PersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = ['id', 'first_name', 'last_name', 'birth_date', 'death_date', 'bio', 'photo', 'extra_data']

class LifeEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = LifeEvent
        fields = ['id', 'title', 'description', 'event_date', 'attachment', 'created_at']

class RelationshipSerializer(serializers.ModelSerializer):
    class Meta:
        model = Relationship
        fields = ['id', 'person_from', 'person_to', 'relationship_type']

class FamilyTreeDetailSerializer(serializers.ModelSerializer):
    persons = PersonSerializer(many=True, read_only=True)
    relationships = RelationshipSerializer(many=True, read_only=True)
    
    class Meta:
        model = FamilyTree
        fields = ['id', 'name', 'privacy', 'persons', 'relationships']

class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'action', 'content_type', 'changes', 'created_at']