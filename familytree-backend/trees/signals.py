from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import AuditLog, TreeMember, Notification


@receiver(post_save, sender=AuditLog)
def notify_tree_members_on_audit_log(sender, instance, created, **kwargs):
    """Уведомляет всех участников дерева, кроме автора изменения, о новой записи в AuditLog."""
    if not created:
        return

    recipient_ids = (
        TreeMember.objects.filter(tree_id=instance.tree_id)
        .exclude(user_id=instance.user_id)
        .values_list('user_id', flat=True)
    )

    Notification.objects.bulk_create([
        Notification(tree_id=instance.tree_id, user_id=uid, audit_log=instance)
        for uid in recipient_ids
    ])
