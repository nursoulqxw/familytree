# Деплой

Два сценария: локально одной командой через Docker (весь стек) и бесплатно в интернет (для
учебного/пет-проекта — без платных серверов).

## 1. Локально через Docker (весь стек)

`docker-compose.yml` лежит в корне репозитория и поднимает четыре контейнера: `db` (Postgres),
`redis` (не используется в коде, про запас), `backend` (Django + gunicorn) и `frontend` (React,
собран и отдаётся через nginx, который же проксирует `/api/*` и `/media/*` на `backend`).

Перед первым запуском нужен `familytree-backend/.env` (см. `familytree-backend/SETUP_LOCAL.md`,
шаг 3) — оттуда backend-контейнер берёт `SECRET_KEY`. Значения `DB_*` в `.env` не важны для Docker:
compose сам подставляет контейнерные (`DB_HOST=db` и т.п.), не трогая ваш `.env`.

```bash
docker compose up -d --build
```

- Фронтенд: `http://localhost:3000`
- API/админка/Swagger: `http://localhost:8000` (`/admin/`, `/api/docs/`)

```bash
docker compose down        # остановить
docker compose down -v     # остановить и стереть данные (Postgres, media)
docker compose logs -f backend
```

## 2. Бесплатный деплой в интернет

Схема из трёх бесплатных сервисов — ничего не платите, домен вида `*.vercel.app`/`*.onrender.com`
достаточно для учебного проекта:

| Что | Куда | Почему |
|---|---|---|
| Frontend (статика) | **Vercel** (или Netlify/Cloudflare Pages) | Бесплатно навсегда для личных проектов, автодеплой по git push, HTTPS из коробки |
| Backend (Django) | **Render** — free web service, деплой по `Dockerfile` | Бесплатный тариф действительно бесплатный (не триал), умеет собрать ваш `Dockerfile` напрямую |
| База данных | **Neon** — serverless Postgres | Бесплатный тариф не удаляет данные по истечении срока (в отличие от free Postgres на самом Render, который живёт ограниченное время) |

### Шаг 1 — база данных (Neon)

1. Зарегистрироваться на neon.tech, создать проект → получите строку подключения вида
   `postgresql://user:password@host/dbname`.
2. Разберите её на части — они понадобятся как `DB_NAME`/`DB_USER`/`DB_PASSWORD`/`DB_HOST` на шаге 2.

### Шаг 2 — backend (Render)

1. New → Web Service → подключить GitHub-репозиторий, Root Directory: `familytree-backend`,
   Render сам увидит `Dockerfile`.
2. Environment → добавить переменные:
   ```
   SECRET_KEY=<сгенерировать заново, не тот что в dev .env>
   DEBUG=False
   ALLOWED_HOSTS=<ваш-backend>.onrender.com
   CORS_ALLOWED_ORIGINS=https://<ваш-frontend>.vercel.app
   CSRF_TRUSTED_ORIGINS=https://<ваш-frontend>.vercel.app
   DB_NAME=... DB_USER=... DB_PASSWORD=... DB_HOST=... DB_PORT=5432   # из строки подключения Neon
   ```
3. Deploy. Render соберёт образ, `command` в `docker-compose.yml` не используется — на Render команду
   запуска задаёте отдельно в его UI: `python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
   (Render сам назначает `$PORT`, не обязательно 8000).

**Важная оговорка для бесплатного тарифа Render**: файловая система эфемерна — при каждом
передеплое/засыпании сервиса содержимое `media/` (фото, сканы) стирается. Для учебного проекта это
приемлемо; если нужно, чтобы фото переживали редеплой — Cloudflare R2 (бесплатно до 10GB) плюс
`django-storages`, но это уже отдельная доработка кода, не входит в текущий деплой.

Также free-тариф Render засыпает после ~15 минут без запросов и просыпается по первому запросу
(10–50 секунд на «холодный старт») — нормально для пет-проекта, не для продакшена с реальными
пользователями.

### Шаг 3 — frontend (Vercel)

1. New Project → тот же репозиторий, Root Directory: `familytree-frontend`.
2. Build command: `npm run build`, Output directory: `dist` (Vercel обычно определяет сам по
   `vite.config.js`).
3. Environment Variables → `VITE_API_URL=https://<ваш-backend>.onrender.com/api`. `src/api/client.js`
   уже это учитывает: без переменной берётся относительный `/api` (для Docker/dev, где фронт и бэк на
   одном origin), с переменной — абсолютный URL (нужен, когда фронт и бэк на *разных* доменах, как
   тут).
4. **Оговорка про фото**: `Person.photo`/`Media.file`/`LifeEvent.attachment` бэкенд отдаёт как
   *относительный* путь (`/media/...`), рассчитанный на то, что дальше стоит прокси на том же origin
   (nginx-контейнер или Vite dev-прокси). При раздельных доменах (Vercel+Render) браузер будет
   пытаться загрузить фото с домена *фронтенда*, а не бэкенда — картинки не отобразятся. Это не
   мешает регистрации/дереву/хронологии работать, но фото будут битые, пока сериализаторы не станут
   отдавать абсолютные URL (`context={'request': request}` в `PersonSerializer`/`MediaSerializer` и
   т.д.) — при таком сценарии деплоя это стоит доделать отдельным шагом.

### Итог

`https://<ваш-frontend>.vercel.app` — рабочее приложение, `https://<ваш-backend>.onrender.com/admin/`
— админка. Оба обновляются автоматически при `git push` в `main` (если включить авто-деплой в
настройках Vercel/Render).
