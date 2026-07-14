"""Django-админка приложения trees — с list_display/фильтрами/поиском и инлайнами
для связанных объектов, чтобы админка была реально пригодна для ручного разбора
данных, а не просто голым CRUD по каждой модели отдельно."""
from django.contrib import admin
from .models import FamilyTree, Person, Relationship, TreeMember, AuditLog, Invitation, LifeEvent, Media, Notification


class TreeMemberInline(admin.TabularInline):
    model = TreeMember
    extra = 0
    autocomplete_fields = ('user',)


class LifeEventInline(admin.TabularInline):
    model = LifeEvent
    extra = 0
    fields = ('title', 'event_date', 'created_by')


class MediaInline(admin.TabularInline):
    model = Media
    extra = 0
    fields = ('file', 'caption', 'created_by')


@admin.register(FamilyTree)
class FamilyTreeAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'privacy', 'members_count', 'persons_count', 'created_at')
    list_filter = ('privacy', 'created_at')
    search_fields = ('name', 'owner__username')
    autocomplete_fields = ('owner',)
    readonly_fields = ('share_token', 'created_at', 'updated_at')
    inlines = [TreeMemberInline]

    @admin.display(description='Участников')
    def members_count(self, obj):
        return obj.members.count()

    @admin.display(description='Персон')
    def persons_count(self, obj):
        return obj.persons.count()


@admin.register(Person)
class PersonAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'tree', 'gender', 'birth_date', 'death_date', 'birth_place', 'created_by', 'created_at')
    list_filter = ('tree', 'gender', 'created_at')
    search_fields = ('first_name', 'last_name', 'patronymic', 'birth_place')
    autocomplete_fields = ('tree', 'created_by')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [LifeEventInline, MediaInline]

    @admin.display(description='ФИО')
    def full_name(self, obj):
        return f'{obj.last_name} {obj.first_name} {obj.patronymic}'.strip()


@admin.register(Relationship)
class RelationshipAdmin(admin.ModelAdmin):
    list_display = ('person_from', 'relationship_type', 'person_to', 'tree', 'created_at')
    list_filter = ('relationship_type', 'tree')
    search_fields = ('person_from__first_name', 'person_from__last_name', 'person_to__first_name', 'person_to__last_name')
    autocomplete_fields = ('tree', 'person_from', 'person_to')


@admin.register(TreeMember)
class TreeMemberAdmin(admin.ModelAdmin):
    list_display = ('user', 'tree', 'role', 'created_at')
    list_filter = ('role',)
    search_fields = ('user__username', 'tree__name')
    autocomplete_fields = ('user', 'tree')


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Журнал — только для чтения: записи создаются кодом (trees/views.py:log_audit),
    редактировать/удалять их вручную через админку не должно быть штатным сценарием."""
    list_display = ('tree', 'user', 'action', 'content_type', 'object_id', 'created_at')
    list_filter = ('action', 'content_type', 'created_at')
    search_fields = ('tree__name', 'user__username')
    autocomplete_fields = ('tree', 'user')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ('tree', 'role', 'email', 'used', 'created_at', 'expires_at')
    list_filter = ('used', 'role')
    search_fields = ('tree__name', 'email', 'token')
    autocomplete_fields = ('tree',)


@admin.register(LifeEvent)
class LifeEventAdmin(admin.ModelAdmin):
    list_display = ('title', 'person', 'event_date', 'created_by', 'created_at')
    list_filter = ('event_date',)
    search_fields = ('title', 'person__first_name', 'person__last_name')
    autocomplete_fields = ('person', 'created_by')


@admin.register(Media)
class MediaAdmin(admin.ModelAdmin):
    list_display = ('caption', 'person', 'created_by', 'created_at')
    search_fields = ('caption', 'person__first_name', 'person__last_name')
    autocomplete_fields = ('person', 'created_by')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'tree', 'is_read', 'created_at')
    list_filter = ('is_read',)
    search_fields = ('user__username', 'tree__name')
    autocomplete_fields = ('user', 'tree', 'audit_log')
