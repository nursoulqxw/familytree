"""Регистрация CustomUser в Django-админке — расширяет стандартный UserAdmin
списком/фильтрами/поиском (нужен и для собственного списка пользователей,
и для autocomplete_fields в trees/admin.py — Django требует search_fields
на модели, на которую ссылается autocomplete)."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active', 'created_at')
    list_filter = UserAdmin.list_filter + ('created_at',)
    search_fields = ('username', 'email', 'first_name', 'last_name')
