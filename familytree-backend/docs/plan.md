# ПЛАН РАЗРАБОТКИ: Family Tree на 2 недели

---

## 🔴 НЕДЕЛЯ 1: BACKEND (ВАШИ ЗАДАЧИ)

### ЗАДАЧА 1.1: JWT Аутентификация
**Приоритет:** КРИТИЧЕСКИЙ | **Время:** 1.5 дня

Установить djangorestframework-simplejwt. Создать:
- RegisterView (регистрация пользователя)
- TokenObtainPairView (логин, получение access/refresh токенов)
- TokenRefreshView (обновление токена через 15 минут)
- LogoutView (добавление в blacklist)

Endpoints: POST /users/register/, POST /auth/token/, POST /auth/token/refresh/, POST /auth/logout/

**Criteria:** Регистрация работает, токены действуют правильно, логин возвращает оба токена

---

### ЗАДАЧА 1.2: Family Tree CRUD API
**Приоритет:** КРИТИЧЕСКИЙ | **Время:** 1.5 дня

Создать FamilyTreeViewSet с полными правами доступа:
- GET /api/family-trees/ — список деревьев пользователя
- POST /api/family-trees/ — создать дерево
- PATCH /api/family-trees/{id}/ — редактировать (только владелец)
- DELETE /api/family-trees/{id}/ — удалить (только владелец)

Permission классы: IsTreeOwnerOrMember, IsTreeOwner

**Criteria:** Только владелец может редактировать, пользователь видит только свои деревья, members_count работает

---

### ЗАДАЧА 1.3: Person API (добавление людей)
**Приоритет:** ВЫСОКИЙ | **Время:** 1 день

PersonViewSet для управления людьми в дереве:
- GET /api/persons/?tree_id=1 — люди в дереве
- POST /api/persons/ — добавить человека
- PATCH /api/persons/{id}/ — редактировать
- DELETE /api/persons/{id}/ — удалить

Поля: имя, фамилия, отчество, даты рождения/смерти, место рождения, биография, фото, extra_data (JSON)

**Criteria:** Валидация дат (рождение < смерть), фото загружается, только члены дерева могут добавлять

---

### ЗАДАЧА 1.4: Relationships API (связи между людьми)
**Приоритет:** ВЫСОКИЙ | **Время:** 0.5 дня

RelationshipViewSet для связей:
- GET /api/relationships/?tree_id=1 — все связи
- POST /api/relationships/ — создать связь
- DELETE /api/relationships/{id}/ — удалить

Типы: parent, child, spouse, sibling. Валидация: нет самосвязей, уникальность

**Criteria:** Нет самосвязей, связи работают для построения графа на фронте

---

### ЗАДАЧА 1.5: Invitations & Team Management
**Приоритет:** СРЕДНИЙ | **Время:** 1 день

Система приглашений:
- POST /api/family-trees/{id}/send-invitation/ — отправить приглашение
- POST /api/invitations/accept/ — принять по токену
- GET /api/family-trees/{id}/members/ — список членов
- DELETE /api/family-trees/{id}/members/{user_id}/ — выгнать члена

Приглашение действует 30 дней, генерирует уникальный токен, может быть использовано только один раз

**Criteria:** Владелец может приглашать, приглашение срабатывает, токен работает 30 дней

---

### ЗАДАЧА 1.6: Audit Logging
**Приоритет:** СРЕДНИЙ | **Время:** 0.5 дня

Django signals для автоматического логирования всех действий:
- Когда создается Person, Relationship — пишется в AuditLog
- GET /api/family-trees/{id}/audit-logs/ — просмотр истории

Логирует: кто, что действие, что изменилось, когда

**Criteria:** Логирование работает автоматически, история сохраняется

---

### ЗАДАЧА 1.7: Backend Tests
**Приоритет:** ВЫСОКИЙ | **Время:** 1 день

Написать тесты (pytest):
- test_auth.py — регистрация, логин, refresh, logout
- test_family_tree.py — CRUD, права доступа
- test_person.py — добавление, обновление, удаление, валидация
- test_relationships.py — создание, валидация

Цель: 80%+ покрытие кода

**Criteria:** Все тесты проходят, покрытие 80%+

---

## 🟠 НЕДЕЛЯ 2: FRONTEND WEB

### ЗАДАЧА 2.1: React Setup
**Приоритет:** КРИТИЧЕСКИЙ | **Время:** 0.5 дня

create-react-app, установить: axios, react-router-dom, zustand, cytoscape

Структура: pages/, components/, services/, store/

API client с interceptor для Authorization заголовка
Zustand store для auth (login, logout, сохранение токена)

**Criteria:** Проект запускается, API работает, auth store готов

---

### ЗАДАЧА 2.2: Auth Pages (Login & Register)
**Приоритет:** КРИТИЧЕСКИЙ | **Время:** 1 день

LoginPage — форма (email, password), сохраняет токены, редирект на dashboard
RegisterPage — форма (email, password, подтверждение), редирект на login
PrivateRoute — защита страниц, редирект на login если не авторизован

Использует endpoints: POST /users/register/, POST /auth/token/

**Criteria:** Регистрация работает, логин работает, токены сохраняются

---

### ЗАДАЧА 2.3: Dashboard (список деревьев)
**Приоритет:** ВЫСОКИЙ | **Время:** 1 день

DashboardPage — список всех деревьев пользователя
TreeCard компонент — отображение info, privacy status, members_count
Модальное окно для создания нового дерева (name, privacy)
Кнопки: Открыть, Удалить

Endpoints: GET /family-trees/, POST /family-trees/, DELETE /family-trees/{id}/

**Criteria:** Список отображается, можно создать и удалить дерево

---

### ЗАДАЧА 2.4: Graph Library Integration (Cytoscape.js)
**Приоритет:** КРИТИЧЕСКИЙ | **Время:** 1.5 дня

FamilyTreeGraph компонент с Cytoscape:
- Узлы = люди (person.id, person.first_name)
- Рёбра = связи (relationship_type)

Интерактивность:
- Клик на узел = открыть профиль
- Drag-and-drop для перемещения
- Zoom in/out, pan

Визуальная иерархия: родители вверху, дети внизу

**Criteria:** Граф отображает людей и связи, интерактивен, иерархия видна

---

### ЗАДАЧА 2.5: Person CRUD (добавление и редактирование людей)
**Приоритет:** ВЫСОКИЙ | **Время:** 1 день

PersonForm компонент — форма с полями: имя, фамилия, отчество, даты, место, биография, фото
PersonCard компонент — карточка профиля

Модальное окно "Добавить человека" (+ кнопка в интерфейсе)
При клике на узел — открыть форму редактирования

Endpoints: POST /persons/, PATCH /persons/{id}/, GET /persons/?tree_id=X, DELETE /persons/{id}/

**Criteria:** Форма валидируется, люди добавляются в граф, фото загружается

---

### ЗАДАЧА 2.6: Relationships UI
**Приоритет:** ВЫСОКИЙ | **Время:** 0.5 дня

UI для создания связей:
- Выбрать двух людей
- Выбрать тип (parent, child, spouse, sibling)
- POST создаёт связь

Удаление связей: DELETE на рёбре в графе

Визуализация: разные стили линий для разных типов, подпись на рёбрах

Endpoints: POST /relationships/, DELETE /relationships/{id}/

**Criteria:** Можно создавать и удалять связи, они отображаются в графе

---

### ЗАДАЧА 2.7: Invitations (frontend)
**Приоритет:** СРЕДНИЙ | **Время:** 0.5 дня

SettingsPage дерева:
- Список членов с их ролями
- Форма для отправки приглашения (email + role)
- Кнопка "Скопировать ссылку приглашения"

InvitePage (/invite/{token}):
- Кнопка "Присоединиться" 

Endpoints: POST /family-trees/{id}/send-invitation/, POST /invitations/accept/, GET /family-trees/{id}/members/

**Criteria:** Владелец может приглашать, по ссылке можно присоединиться

---

### ЗАДАЧА 2.8: Frontend Tests
**Приоритет:** СРЕДНИЙ | **Время:** 0.5 дня

Jest + React Testing Library тесты для:
- LoginPage
- DashboardPage
- FamilyTreeGraph
- PersonCard

Цель: 60%+ покрытие критических компонентов

**Criteria:** Тесты проходят

---

## 🟡 НЕДЕЛЯ 2 (ПАРАЛЛЕЛЬНО): МОБИЛКА (React Native)

### ЗАДАЧА 3.1: React Native Setup
**Время:** 0.5 дня | Expo или RN CLI, базовая структура, React Navigation

### ЗАДАЧА 3.2: Auth Screens
**Время:** 0.5 дня | Login & Register, SecureStore для токенов

### ЗАДАЧА 3.3: Dashboard
**Время:** 0.5 дня | Список деревьев, создание нового

### ЗАДАЧА 3.4: Mobile Graph
**Время:** 1 день | Touch-friendly граф, pan & pinch zoom, оптимизация для мобилки

### ЗАДАЧА 3.5: Person Profiles
**Время:** 0.5 дня | Просмотр/редактирование профилей, фото с камеры/галереи

### ЗАДАЧА 3.6: Offline Sync
**Время:** 0.5 дня | AsyncStorage для кэша, синхронизация при подключении

**ИТОГО мобилка:** 3.5 дня

---

## ✅ ФИНАЛЬНЫЙ ЧЕКЛИСТ

### Backend (7 дней)
✅ JWT аутентификация
✅ Family Tree CRUD
✅ Person API
✅ Relationships API
✅ Invitations система
✅ Audit Logging
✅ Tests 80%+

### Frontend Web (6.5 дней)
✅ React Setup
✅ Auth Pages
✅ Dashboard
✅ Graph с Cytoscape
✅ Person CRUD
✅ Relationships UI
✅ Invitations
✅ Tests 60%+

### Mobile (3.5 дня, параллельно)
✅ Auth работает
✅ Можно просмотреть деревья
✅ Mobile граф функционален
✅ Offline синхронизация

---

**ИТОГО:** 16 задач | 2 недели | Полный MVP готов к запуску