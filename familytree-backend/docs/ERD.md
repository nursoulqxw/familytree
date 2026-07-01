# ER-диаграмма базы данных (FamilyTree backend)

Сгенерировано по фактическим моделям Django (`users/models.py`, `trees/models.py`, состояние на 2026-07-01, после миграций `trees.0002_treemember`, `trees.0003_person_extra_data_lifeevent` и `trees.0004_familytree_share_token`).
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
    PERSON ||--o{ LIFE_EVENT : "person"
    CUSTOM_USER ||--o{ LIFE_EVENT : "created_by"

    LIFE_EVENT {
        int id PK
        int person_id FK
        string title
        text description
        date event_date
        file attachment "фото или скан документа"
        int created_by_id FK "nullable, SET_NULL"
        datetime created_at
    }

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
        string share_token UK "активен только при privacy=link"
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
        json extra_data "гибкие нестандартные поля (JSONB)"
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
- **Person.extra_data** (JSONField → в Postgres это колонка `jsonb`): гибкое хранилище нестандартных анкетных полей (профессия, национальность и т.п.), которые не у каждой семьи одинаковые. Не требует миграции при добавлении нового произвольного поля.
- **Person → LifeEvent** (1 ко многим): хронология жизни — отдельная таблица, а не поле в `Person`. Это намеренно: `full_tree` (граф для фронтенда) отдаёт только компактный `PersonSerializer` без событий, а `LifeEvent` подгружается отдельным запросом `GET /api/trees/{tree_id}/persons/{person_id}/life-events/` — так соблюдается требование ТЗ про ленивую загрузку детальной информации о профилях (п. 3.1).
- **FamilyTree.privacy + share_token**: `privacy` теперь реально управляет доступом на чтение (не только хранится как метка). `private` — только участники (`TreeMember`); `public` — читает любой авторизованный пользователь, даже не участник; `link` — читает любой авторизованный пользователь, если передаст верный `share_token` (например, `GET /api/trees/4/?share_token=...`). Во всех трёх случаях **запись** (создание/изменение persons, relationships, life-events, настроек дерева) разрешена только реальным `TreeMember` с ролью `owner`/`editor` — privacy расширяет только чтение, не права редактирования. `audit_log` не подчиняется privacy — доступен только участникам, даже если дерево публичное.
- **Список деревьев (`GET /api/trees/`) отдаёт `FamilyTreeListSerializer`**, а не `FamilyTreeDetailSerializer` — только `id/name/persons/relationships` не включены. Это осознанное изменение формы ответа (было: каждый элемент списка содержал вложенные `persons`/`relationships`) — вложенные данные остаются только в `retrieve` (`GET /api/trees/{id}/`) и в `full_tree`. Если фронтенд уже ожидает `persons`/`relationships` в списке — нужно переключить его на `full_tree` для конкретного дерева.

## Известные пробелы в модели (см. также TODO в коде)

Закрыто (2026-07-01):
- миграция `trees.0002_treemember` — роли `editor`/`reader` теперь реально дают/ограничивают доступ через `TreeMember`; `accept_invite` выдаёт доступ, а не просто гасит токен; `RelationshipViewSet` и `PersonViewSet` проверяют членство в дереве, а не только `tree_id` из URL.
- миграция `trees.0003_person_extra_data_lifeevent` — добавлено JSONB-поле `Person.extra_data` и модель `LifeEvent` (хронология жизни с вложением фото/документа).
- миграция `trees.0004_familytree_share_token` — `privacy` (`public`/`link`) теперь реально влияет на доступ к чтению дерева, а не просто хранится как неиспользуемая метка.
- N+1 в `GET /api/trees/` (п. 3.2 ТЗ) — список деревьев делал 2 лишних запроса на каждое дерево (вложенные `persons`/`relationships` через `tree.persons.all()`/`tree.relationships.all()` для каждого объекта списка). Исправлено через `FamilyTreeListSerializer` без вложенных полей. Остальные эндпоинты (`full_tree`, `persons`, `relationships`, `audit_log`) уже были в порядке — DRF's `PrimaryKeyRelatedField` не делает запрос на каждую строку для простых FK-полей (`person_from`, `person_to`, `user`), это внутренняя оптимизация `PKOnlyObject`. Регрессия закрыта тестами в `trees/tests.py::QueryCountRegressionTests` (сравнивают число SQL-запросов на маленьком и большом наборе данных).

Осталось не реализовано (сознательно не входило в этот заход):
- Общая медиа-галерея на персону (несколько архивных фото вне привязки к конкретному событию) — сейчас есть только `Person.photo` (одно фото) и по одному вложению на каждое `LifeEvent`.
- Рекурсивные CTE для выгрузки иерархий (п. 3.1 ТЗ) — отдельная задача, не связанная с N+1: сборка иерархии предок/потомок сейчас вообще не делается на бэкенде.
- Уведомления об изменениях (п. 2.4 ТЗ) — пока есть только `AuditLog`, никто активно не оповещается о новых записях.
- "Каталог" публичных деревьев — сейчас `privacy=public` открывает чтение конкретного дерева по его ID, но не добавляет его в общий список для всех пользователей; `GET /api/trees/` по-прежнему показывает только "мои" деревья.
