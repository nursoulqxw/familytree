import uuid
from django.db import models
from django.contrib.auth import get_user_model
from users.models import CustomUser

User = get_user_model()

def generate_share_token():
    return uuid.uuid4().hex

class FamilyTree(models.Model):
    PRIVACY_CHOICES = [
        ('private', 'Закрытое'),
        ('link', 'По ссылке'),
        ('public', 'Открытое'),
    ]

    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)  # "Семья Сидоровых"
    privacy = models.CharField(max_length=10, choices=PRIVACY_CHOICES, default='private')
    # действует только когда privacy='link': кто угодно с этим токеном получает доступ на чтение
    share_token = models.CharField(max_length=64, unique=True, default=generate_share_token, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['owner', 'created_at']),
        ]

class TreeMember(models.Model):
    tree = models.ForeignKey(FamilyTree, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tree_memberships')
    role = models.CharField(max_length=20, choices=CustomUser.ROLES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tree', 'user')
        indexes = [
            models.Index(fields=['user', 'tree']),
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

    # произвольные нестандартные анкетные поля (национальность, профессия и т.п.),
    # которые не у каждой семьи одинаковые и не заслуживают отдельной колонки
    extra_data = models.JSONField(default=dict, blank=True)

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['tree', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}"

class LifeEvent(models.Model):
    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name='life_events')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    event_date = models.DateField(null=True, blank=True)
    attachment = models.FileField(upload_to='events/%Y/%m/', null=True, blank=True)  # фото или скан документа

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['event_date', 'created_at']
        indexes = [
            models.Index(fields=['person', 'event_date']),
        ]

class Media(models.Model):
    """Общая галерея архивных фото/сканов на персону — в отличие от Person.photo (одно
    основное фото) и LifeEvent.attachment (вложение к конкретному событию), сюда попадает
    всё остальное: старые снимки, сканы документов и т.п., не привязанные к дате/событию."""
    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name='media')
    file = models.FileField(upload_to='persons/%Y/%m/media/')
    caption = models.CharField(max_length=255, blank=True)

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['person', 'created_at']),
        ]

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

class Notification(models.Model):
    """Уведомление участнику дерева о чужом изменении (создаётся автоматически сигналом
    на AuditLog — см. trees/signals.py). Модель под polling (GET .../?unread=true),
    не под real-time push."""
    tree = models.ForeignKey(FamilyTree, on_delete=models.CASCADE, related_name='notifications')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    audit_log = models.ForeignKey(AuditLog, on_delete=models.CASCADE, related_name='notifications')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
        ]

class Invitation(models.Model):
    tree = models.ForeignKey(FamilyTree, on_delete=models.CASCADE)
    token = models.CharField(max_length=255, unique=True)
    role = models.CharField(max_length=20, choices=CustomUser.ROLES)
    email = models.EmailField(blank=True)
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()  # через 30 дней