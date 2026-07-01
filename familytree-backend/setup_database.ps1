# 📊 SOZDANIE BD I USERA V POSTGRESQL
# Windows Services: Services.msc -> PostgreSQL running

Write-Host "🔧 Создание пользователя и базы данных..." -ForegroundColor Cyan

$pgUser = "postgres"
$pgPassword = "postgres" 

# SQL команды
$sqlCommands = @"
-- Создать пользователя devuser
CREATE USER devuser WITH PASSWORD 'devpassword';

-- Создать БД familytree
CREATE DATABASE familytree OWNER devuser;

-- Дать права
ALTER ROLE devuser SET client_encoding TO 'utf8';
ALTER ROLE devuser SET default_transaction_isolation TO 'read committed';
ALTER ROLE devuser SET default_transaction_deferrable TO on;
ALTER ROLE devuser SET default_time_zone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE familytree TO devuser;
"@

Write-Host "Сохраняю SQL команды..." -ForegroundColor Yellow
$sqlCommands | Set-Content -Path "setup_db.sql" -Encoding UTF8

Write-Host "Выполняю SQL команды в PostgreSQL..." -ForegroundColor Yellow

$env:PGPASSWORD = $pgPassword
psql -U $pgUser -h localhost -f setup_db.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ БД и юзер созданы успешно!" -ForegroundColor Green
    Write-Host "📋 Данные для подключения:" -ForegroundColor Green
    Write-Host "   User: devuser" -ForegroundColor Green
    Write-Host "   Password: devpassword" -ForegroundColor Green
    Write-Host "   Database: familytree" -ForegroundColor Green
    Write-Host "   Host: localhost" -ForegroundColor Green
    Write-Host "   Port: 5432" -ForegroundColor Green
} else {
    Write-Host "`n❌ Ошибка при создании БД!" -ForegroundColor Red
    Write-Host "Проверь:" -ForegroundColor Yellow
    Write-Host "   1. PostgreSQL запущен (Services.msc)" -ForegroundColor Yellow
    Write-Host "   2. Пароль postgres правильный" -ForegroundColor Yellow
    Write-Host "   3. psql доступен в PATH" -ForegroundColor Yellow
}

# Удаляем временный файл
Remove-Item setup_db.sql -Force

Write-Host "`nТеперь в .env файл добавь:" -ForegroundColor Cyan
# Исправлено: Сначала пишем текст, закрываем маркер на отдельной строке, а цвет задаем через промежуточную переменную
$envText = @"
DB_NAME=familytree
DB_USER=devuser
DB_PASSWORD=devpassword
DB_HOST=localhost
DB_PORT=5432
"@
Write-Host $envText -ForegroundColor Gray