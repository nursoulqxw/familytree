# ER-диаграмма базы данных (FamilyTree backend)

Сгенерировано по фактическим моделям Django (`users/models.py`, `trees/models.py`, состояние на 2026-07-01).
Открывается как обычный Mermaid-диаграмма — GitHub, GitLab и VS Code (расширение Markdown Preview Mermaid) рендерят её автоматически.

```mermaid
erDiagram
    CUSTOM_USER ||--o{ FAMILY_TREE : "owner (владеет)"
    CUSTOM_USER ||--o{ PERSON : "created_by (автор записи)"
    CUSTOM_USER ||--o{ AUDIT_LOG : "user (кто изменил)"

    FAMILY_TREE ||--o{ PERSON : "tree"
    FAMILY_TREE ||--o{ RELATIONSHIP : "tree"
    FAMILY_TREE ||--o{ AUDIT_LOG : "tree"
    FAMILY_TREE ||--o{ INVITATION : "tree"

    PERSON ||--o{ RELATIONSHIP : "person_from (outgoing)"
    PERSON ||--o{ RELATIONSHIP : "person_to (incoming)"

    CUSTOM_USER {
        int id PK
        string username
        string email
        string password
        string first_name
        string last_name
        bool is_staff
        bool is_active
        datetime created_at
    }

    FAMILY_TREE {
        int id PK
        int owner_id FK
        string name
        string privacy "private | link | public"
        datetime created_at
        datetime updated_at
    }

    PERSON {
        int id PK
        int tree_id FK
        string first_name
        string last_name
        string patronymic
        date birth_date
        date death_date
        string birth_place
        text bio
        image photo
        int created_by_id FK "nullable, SET_NULL"
        datetime created_at
        datetime updated_at
    }

    RELATIONSHIP {
        int id PK
        int tree_id FK
        int person_from_id FK
        int person_to_id FK
        string relationship_type "parent | child | spouse | sibling"
        datetime created_at
    }

    AUDIT_LOG {
        int id PK
        int tree_id FK
        int user_id FK "nullable, SET_NULL"
        string action "create | update | delete"
        string content_type "Person | Relationship"
        int object_id
        json changes
        datetime created_at
    }

    INVITATION {
        int id PK
        int tree_id FK
        string token UK
        string role "owner | editor | reader"
        string email
        bool used
        datetime created_at
        datetime expires_at
    }
```

## Пояснения к связям

- **CustomUser → FamilyTree** (1 ко многим): один пользователь может владеть несколькими деревьями. Владелец = единственный, кто сейчас имеет доступ (`FamilyTreeViewSet.get_queryset` фильтрует `owner=request.user`).
- **FamilyTree → Person / Relationship / AuditLog / Invitation** (1 ко многим): всё живёт внутри дерева, при удалении дерева каскадно удаляется (`on_delete=CASCADE`).
- **Person → Relationship**: связь моделируется как направленное ребро графа (`person_from` → `person_to`) с типом (`parent/child/spouse/sibling`), а не как обычное дерево через `parent_id`. Это позволяет хранить супругов/братьев-сестёр, но требует ручной логики построения иерархии на бэкенде или фронте.
- Уникальность `(person_from, person_to, relationship_type)` не даёт задублировать одну и ту же связь.

## Известные пробелы в модели (см. также TODO в коде)

1. **Нет модели `TreeMember`** — роли `editor`/`reader` объявлены (в `CustomUser.ROLES` и `Invitation.role`), но нигде не хранится, кто из приглашённых имеет доступ к какому дереву и с какой ролью. `accept_invite` сейчас просто помечает инвайт использованным, доступ не выдаёт. Для соответствия ТЗ (роли, совместное редактирование) нужна таблица вида:
   ```
   TREE_MEMBER { id PK, tree_id FK, user_id FK, role, created_at }
   ```
2. **Нет tenant-изоляции на уровне БД для приглашённых** — сейчас изоляция работает только "owner видит только свои деревья", что не то же самое, что multi-tenant доступ для editor/reader.
3. **ТЗ упоминает JSONB для гибких анкетных полей** — в текущей модели `Person` все поля жёстко заданы (first_name, last_name и т.д.), JSONB-поля для произвольных атрибутов не предусмотрены.
4. **Нет модели для timeline-событий** (п. 2.3 ТЗ — "хронология жизни") — сейчас есть только `bio` (текстовое поле) и `photo` (одно фото на человека), а не набор архивных фото/документов на профиль.
