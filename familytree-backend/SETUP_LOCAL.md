# Локальный запуск backend без Docker

Инструкция для запуска `familytree-backend` напрямую на машине разработчика, без Docker.
Полностью контейнерный вариант (Postgres + Redis + backend + frontend одной командой) описан в
[`../DEPLOY.md`](../DEPLOY.md) — `docker-compose.yml` лежит в корне репозитория, а не здесь, потому что
поднимает и бэкенд, и фронтенд сразу. Секреты бэкенд-контейнер берёт из того же `.env` (см. шаг 3 ниже).
Redis по-прежнему нигде не используется в коде — присутствует про запас, не нужен для запуска ни в
контейнере, ни локально.

## 0. Что нужно поставить заранее

- **Python 3.14** (проект собран под него — см. `.venv/pyvenv.cfg` и скомпилированные `.pyc`)
- **PostgreSQL 15+**, установленный локально как сервис (не в контейнере)
- Redis пока в коде нигде не используется — для запуска backend он не нужен

## 1. Виртуальное окружение

В проекте уже есть готовая `.venv`. Если создаёте с нуля:

```powershell
cd familytree-backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 2. PostgreSQL: создать пользователя и базу

В репозитории уже есть готовый скрипт `setup_database.ps1`, который создаёт пользователя `devuser`/`devpassword` и базу `familytree`. Он ожидает, что:
- PostgreSQL запущен как Windows-служба (`Services.msc` → PostgreSQL running)
- Есть суперпользователь `postgres` с паролем `postgres` (если у тебя другой пароль — поменяй `$pgPassword` в скрипте перед запуском)
- `psql` доступен в `PATH`

Запуск:

```powershell
cd familytree-backend
.\setup_database.ps1
```

Если скрипт не подходит (другой пароль/версия PostgreSQL), можно создать БД вручную:

```sql
CREATE USER devuser WITH PASSWORD 'devpassword';
CREATE DATABASE familytree OWNER devuser;
GRANT ALL PRIVILEGES ON DATABASE familytree TO devuser;
```

## 3. Файл `.env`

В корне `familytree-backend/` должен быть `.env` (сейчас он уже есть и в `.gitignore`, каждый разработчик создаёт свой). Минимальный набор переменных:

```env
SECRET_KEY=любая-случайная-строка-для-разработки
DEBUG=True
DB_NAME=familytree
DB_USER=devuser
DB_PASSWORD=devpassword
DB_HOST=localhost
DB_PORT=5432
```

`SECRET_KEY` можно сгенерировать так:

```powershell
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## 4. Миграции и суперпользователь

```powershell
python manage.py migrate
python manage.py createsuperuser
```

Тесты (72 теста, ~96% покрытия по `trees`/`users`):

```powershell
pytest                      # с покрытием, настройки в pytest.ini
python manage.py test       # тот же набор тестов через штатный раннер Django
```

## 5. Запуск сервера

```powershell
python manage.py runserver
```

API будет доступен на `http://localhost:8000/api/...`, админка — на `http://localhost:8000/admin/`.

**Swagger-документация** (drf-spectacular): `http://localhost:8000/api/docs/` — интерактивный Swagger UI со всеми эндпоинтами, можно жать "Try it out" прямо из браузера (для защищённых эндпоинтов — кнопка "Authorize" вверху, вставить `access`-токен). Redoc-версия (просто почитать) — `http://localhost:8000/api/redoc/`. Сырая OpenAPI-схема — `http://localhost:8000/api/schema/`.

**Dev-консоль** (мини-HTML для ручного тестирования без Swagger/Postman): `http://localhost:8000/dev/` — регистрация/логин, создание дерева, добавление персон, инвайты, уведомления. Доступна только при `DEBUG=True`.

CORS уже настроен на `http://localhost:3000` (см. `config/settings.py`) — это адрес, с которого фронтенд будет ходить в API при локальной разработке.

## Проверка, что всё работает

```powershell
# Регистрация
curl -X POST http://localhost:8000/api/auth/register/ -H "Content-Type: application/json" -d '{"username":"test","email":"test@test.com","password":"testpass123"}'

# Логин
curl -X POST http://localhost:8000/api/auth/login/ -H "Content-Type: application/json" -d '{"username":"test","password":"testpass123"}'
```

В ответ должны прийти `access`/`refresh` JWT-токены.

## Частые проблемы

- **`django.db.utils.OperationalError: could not connect to server`** — PostgreSQL-служба не запущена, либо неверный `DB_HOST`/`DB_PORT` в `.env`.
- **`ImportError: PIL`** — не установлен Pillow (нужен для `ImageField` в модели `Person`). В `requirements.txt` он уже добавлен, переустанови зависимости: `pip install -r requirements.txt`.
- **Загруженные файлы (`Person.photo`, `LifeEvent.attachment`, `Media.file`)** сохраняются в `familytree-backend/media/` и отдаются по `MEDIA_URL=/media/...` независимо от `DEBUG` (`config/urls.py`, через `django.views.static.serve`). Это временное решение до объектного хранилища (S3-подобного, с presigned URL, как задумано по ТЗ) — раздача самим Django не проверяет приватность/роли дерева и не годится под нагрузку.
