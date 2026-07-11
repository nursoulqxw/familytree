FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# libjpeg/zlib — нужны Pillow для работы с Person.photo (JPEG/PNG)
RUN apt-get update \
    && apt-get install -y --no-install-recommends libjpeg62-turbo zlib1g \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# collectstatic не трогает БД, но settings.py (через simplejwt) требует непустой SECRET_KEY
# уже на этапе импорта — реальный ключ подставляется в рантайме через docker-compose/.env,
# этот плейсхолдер используется только для сборки статики при build.
RUN SECRET_KEY=build-time-placeholder python manage.py collectstatic --noinput

EXPOSE 8000

# Миграции гоняются при старте контейнера (см. docker-compose.yml command), не здесь —
# на этапе build ещё нет доступа к базе данных.
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
