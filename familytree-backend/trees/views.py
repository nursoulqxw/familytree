from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import FamilyTree, Person, Relationship, AuditLog
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
        # только свои деревья
        return FamilyTree.objects.filter(owner=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
    
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
        
        # TODO: добавить роль пользователя в дерево (нужна модель TreeMember)
        # для MVP можно пока пропустить, просто дать доступ по token'у
        
        invitation.used = True
        invitation.save()
        
        return Response({'message': 'Вы присоединились'})

class PersonViewSet(viewsets.ModelViewSet):
    serializer_class = PersonSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        tree_id = self.kwargs.get('tree_id')
        return Person.objects.filter(tree_id=tree_id)
    
    def perform_create(self, serializer):
        tree_id = self.kwargs.get('tree_id')
        tree = get_object_or_404(FamilyTree, id=tree_id, owner=self.request.user)
        
        person = serializer.save(tree=tree, created_by=self.request.user)
        
        # Логирование
        AuditLog.objects.create(
            tree=tree,
            user=self.request.user,
            action='create',
            content_type='Person',
            object_id=person.id,
            changes={'created': person.__dict__}
        )

class RelationshipViewSet(viewsets.ModelViewSet):
    serializer_class = RelationshipSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        tree_id = self.kwargs.get('tree_id')
        return Relationship.objects.filter(tree_id=tree_id)