# ER-диаграмма базы данных (FamilyTree backend)

Сгенерировано по фактическим моделям Django (`users/models.py`, `trees/models.py`, состояние на 2026-07-01, после добавления `TreeMember` в миграции `trees.0002_treemember`).
Открывается как обычный Mermaid-диаграмма — GitHub, GitLab и VS Code (расширение Markdown Preview Mermaid) рендерят её автоматически.

```mermaid
erDiagram
    CUSTOM_USER ||--o{ FAMILY_TREE : "owner (владеет)"
    CUSTOM_USER ||--o{ PERSON : "created_by (автор записи)"
    CUSTOM_USER ||--o{ AUDIT_LOG : "user (кто изменил)"
    CUSTOM_USER ||--o{ TREE_MEMBER : "user (участник дерева)"

    FAMILY_TREE ||--o{ PERSON : "tree"
    FAMILY_TREE ||--o{ RELATIONSHIP : "tree"
    FAMILY_TREE ||--o{ AUDIT_LOG : "tree"
    FAMILY_TREE ||--o{ INVITATION : "tree"
    FAMILY_TREE ||--o{ TREE_MEMBER : "tree"

    PERSON ||--o{ RELATIONSHIP : "person_from (outgoing)"
    PERSON ||--o{ RELATIONSHIP : "person_to (incoming)"

    TREE_MEMBER {
        int id PK
        int tree_id FK
        int user_id FK
        string role "owner | editor | reader"
        datetime created_at
    }

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

- **CustomUser → FamilyTree** (1 ко многим): `owner` — исторический "главный" владелец дерева (нужен, например, чтобы знать, кого нельзя разжаловать). Реальный доступ и права теперь определяются через `TreeMember`, а не напрямую через это поле.
- **TreeMember** — таблица доступа: кто из пользователей состоит в каком дереве и с какой ролью (`owner/editor/reader`). `unique_together(tree, user)` — у пользователя одна роль на дерево. При создании дерева владельцу автоматически создаётся запись с `role=owner`; при принятии инвайта (`accept_invite`) создаётся/обновляется запись с ролью из инвайта. Все вьюсеты (`FamilyTreeViewSet`, `PersonViewSet`, `RelationshipViewSet`) фильтруют доступ через эту таблицу, а не через `owner`.
- **FamilyTree → Person / Relationship / AuditLog / Invitation / TreeMember** (1 ко многим): всё живёт внутри дерева, при удалении дерева каскадно удаляется (`on_delete=CASCADE`).
- **Person → Relationship**: связь моделируется как направленное ребро графа (`person_from` → `person_to`) с типом (`parent/child/spouse/sibling`), а не как обычное дерево через `parent_id`. Это позволяет хранить супругов/братьев-сестёр, но требует ручной логики построения иерархии на бэкенде или фронте.
- Уникальность `(person_from, person_to, relationship_type)` не даёт задублировать одну и ту же связь.

## Известные пробелы в модели (см. также TODO в коде)

Закрыто (2026-07-01, миграция `trees.0002_treemember`): роли `editor`/`reader` теперь реально дают/ограничивают доступ через `TreeMember`; `accept_invite` выдаёт доступ, а не просто гасит токен; `RelationshipViewSet` и `PersonViewSet` проверяют членство в дереве, а не только `tree_id` из URL.

Осталось не реализовано:

1. **ТЗ упоминает JSONB для гибких анкетных полей** — в текущей модели `Person` все поля жёстко заданы (first_name, last_name и т.д.), JSONB-поля для произвольных атрибутов не предусмотрены.
2. **Нет модели для timeline-событий** (п. 2.3 ТЗ — "хронология жизни") — сейчас есть только `bio` (текстовое поле) и `photo` (одно фото на человека), а не набор архивных фото/документов на профиль.
