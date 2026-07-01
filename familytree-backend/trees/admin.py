from django.contrib import admin
from .models import FamilyTree, Person, Relationship, TreeMember, AuditLog, Invitation

admin.site.register(FamilyTree)
admin.site.register(Person)
admin.site.register(Relationship)
admin.site.register(TreeMember)
admin.site.register(AuditLog)
admin.site.register(Invitation)
