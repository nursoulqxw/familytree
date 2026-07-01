import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def create_owner_memberships(apps, schema_editor):
    """Существующие деревья создавались до появления TreeMember —
    без этого их владельцы потеряют доступ, т.к. get_queryset теперь
    фильтрует деревья по членству, а не по полю owner."""
    FamilyTree = apps.get_model('trees', 'FamilyTree')
    TreeMember = apps.get_model('trees', 'TreeMember')
    for tree in FamilyTree.objects.all():
        TreeMember.objects.get_or_create(
            tree=tree, user=tree.owner, defaults={'role': 'owner'}
        )


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('trees', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='TreeMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(choices=[('owner', 'Владелец'), ('editor', 'Редактор'), ('reader', 'Читатель')], max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('tree', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='members', to='trees.familytree')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tree_memberships', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddIndex(
            model_name='treemember',
            index=models.Index(fields=['user', 'tree'], name='trees_treem_user_id_1adbac_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='treemember',
            unique_together={('tree', 'user')},
        ),
        migrations.RunPython(create_owner_memberships, migrations.RunPython.noop),
    ]
