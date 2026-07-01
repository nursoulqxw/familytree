from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    ROLES = [
        ('owner', 'Владелец'),
        ('editor', 'Редактор'),
        ('reader', 'Читатель'),
    ]
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'users_user'