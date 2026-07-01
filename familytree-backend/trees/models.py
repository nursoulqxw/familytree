from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class FamilyTree(models.Model):
    PRIVACY_CHOICES = [
        ('private', 'Закрытое'),
        ('link', 'По ссылке'),
        ('public', 'Открытое'),
    ]
    
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)  # "Семья Сидоровых"
    privacy = models.CharField(max_length=10, choices=PRIVACY_CHOICES, default='private')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['owner', 'created_at']),
        ]

class Person(models.Model):
    tree = models.ForeignKey(FamilyTree, on_delete=models.CASCADE, related_name='persons')
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    patronymic = models.CharField(max_length=100, blank=True)
    
    birth_date = models.DateField(null=True, blank=True)
    death_date = models.DateField(null=True, blank=True)
    birth_place = models.CharField(max_length=255, blank=True)
    
    bio = models.TextField(blank=True)  # воспоминания, заметки
    photo = models.ImageField(upload_to='persons/%Y/%m/', null=True, blank=True)
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['tree', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}"

class Relationship(models.Model):
    RELATIONSHIP_TYPES = [
        ('parent', 'Родитель'),
        ('child', 'Ребёнок'),
        ('spouse', 'Супруг'),
        ('sibling', 'Брат/Сестра'),
    ]
    
    tree = models.ForeignKey(FamilyTree, on_delete=models.CASCADE, related_name='relationships')
    person_from = models.ForeignKey(Person, on_delete=models.CASCADE, related_name='outgoing')
    person_to = models.ForeignKey(Person, on_delete=models.CASCADE, related_name='incoming')
    relationship_type = models.CharField(max_length=20, choices=RELATIONSHIP_TYPES)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('person_from', 'person_to', 'relationship_type')
        indexes = [
            models.Index(fields=['tree', 'person_from']),
        ]

class AuditLog(models.Model):
    tree = models.ForeignKey(FamilyTree, on_delete=models.CASCADE, related_name='audit_logs')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    action = models.CharField(max_length=50)  # 'create', 'update', 'delete'
    content_type = models.CharField(max_length=50)  # 'Person', 'Relationship'
    object_id = models.IntegerField()
    changes = models.JSONField(default=dict)  # {'field': {'old': ..., 'new': ...}}
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['tree', 'created_at']),
        ]

from users.models import CustomUser

class Invitation(models.Model):
    tree = models.ForeignKey(FamilyTree, on_delete=models.CASCADE)
    token = models.CharField(max_length=255, unique=True)
    role = models.CharField(max_length=20, choices=CustomUser.ROLES)
    email = models.EmailField(blank=True)
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()  # через 30 дней