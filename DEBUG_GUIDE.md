# Руководство по отладке PsychoSite

## 🔧 Настройка отладки

### Backend (ASP.NET Core)

**Отладка в VS Code:**
1. Откройте файл `launch.json`
2. Выберите конфигурацию "Backend: PsychoSite.Api"
3. Нажмите F5 для запуска с отладкой

**Точки останова:**
- Устанавливайте точки останова в контроллерах и сервисах
- Логи выводятся в терминал отладки

**Swagger UI для тестирования API:**
- Откройте: `http://localhost:5000/swagger`
- Авторизуйтесь через кнопку "Authorize"
- Используйте токен из frontend (localStorage → auth_token)

### Frontend (Angular)

**Отладка в VS Code:**
1. Выберите конфигурацию "Frontend: PsychoSite.Web"
2. Нажмите F5
3. Отладчик подключится к Chrome

**DevTools в браузере:**
```
F12 → Console - логи приложения
F12 → Network - HTTP запросы
F12 → Application → Local Storage - токен аутентификации
```

## 📊 Логирование

### Backend логи

Уровень логирования настроен в `appsettings.json`:
```json
"Logging": {
  "LogLevel": {
    "Default": "Debug",
    "Microsoft.AspNetCore": "Information"
  }
}
```

**Просмотр логов:**
- В терминале где запущен `dotnet run`
- В VS Code Debug Console

**Примеры логов:**
```
info: PsychoSite.Api.Controllers.BlockedSlotsController[0]
      GetByRange: start=2026-02-22T21:00:00.000Z, end=2026-04-05T20:59:59.999Z
info: PsychoSite.Api.Controllers.BlockedSlotsController[0]
      Parsed dates: 2026-02-23 to 2026-04-06
info: PsychoSite.Api.Controllers.BlockedSlotsController[0]
      Found 0 blocked slots
```

### Frontend логи

Включены в сервисах через `console.log()`:
```typescript
// Пример в appointment.service.ts
this.http.get<TimeSlot[]>(...).subscribe({
  next: (slots) => console.log('Slots loaded:', slots),
  error: (err) => console.error('Error loading slots:', err)
});
```

## 🐛 Частые проблемы и решения

### Ошибка 404 Not Found

**Проблема:** Backend не запущен или неверный URL

**Решение:**
1. Проверьте что backend запущен: `http://localhost:5000/swagger`
2. Проверьте proxy.conf.json:
```json
{
  "/api": {
    "target": "http://localhost:5000",
    "secure": false
  }
}
```

### Ошибка 500 Internal Server Error

**Проблема:** Ошибка на сервере

**Решение:**
1. Проверьте backend логи в терминале
2. Откройте `/error` endpoint для деталей
3. Проверьте Swagger → попробуйте запрос там

### Ошибка CORS

**Проблема:** Frontend не может подключиться к backend

**Решение:**
1. Проверьте что CORS настроен в Program.cs
2. Проверьте что frontend на правильном порту (4200)
3. Перезапустите backend

### JWT Token истёк

**Проблема:** 401 Unauthorized

**Решение:**
1. Выйдите из админ-панели
2. Войдите снова
3. Или обновите токен в localStorage

## 🔍 Отладка API запросов

### Через Swagger (рекомендуется)

1. Откройте `http://localhost:5000/swagger`
2. Разверните нужный endpoint
3. Нажмите "Try it out"
4. Заполните параметры
5. Нажмите "Execute"
6. Смотрите Response и Curl

### Через Browser DevTools

1. F12 → Network
2. Выполните действие в приложении
3. Найдите запрос в списке
4. Посмотрите:
   - Request Headers (Authorization)
   - Request Payload (данные)
   - Response (ответ сервера)

### Через VS Code Debugger

1. Установите точку останова в контроллере
2. Выполните запрос из frontend
3. Debugger остановится в точке останова
4. Смотрите переменные в Debug Console

## 📁 Полезные файлы для отладки

### Backend
- `Program.cs` - конфигурация приложения
- `appsettings.json` - настройки и connection strings
- `Controllers/*.cs` - API endpoints
- `Services/*.cs` - бизнес-логика

### Frontend
- `proxy.conf.json` - proxy настройки
- `app.config.ts` - Angular конфигурация
- `services/*.ts` - API сервисы
- `components/*.ts` - компоненты

## 🚀 Быстрый старт отладки

```bash
# Терминал 1 - Backend с отладкой
cd src/PsychoSite.Api
dotnet run

# Терминал 2 - Frontend
cd src/PsychoSite.Web
npm run start

# Браузер
http://localhost:4200 - frontend
http://localhost:5000/swagger - API документация
```

## 📝 Тестовые данные

### Вход в админ-панель
```
Login: admin
Password: admin123
```

### Тестовый запрос
```bash
# Получить слоты для записи
GET http://localhost:5000/api/appointments/slots

# Войти
POST http://localhost:5000/api/auth/login
{
  "username": "admin",
  "password": "admin123"
}

# Получить блокировки (нужен токен)
GET http://localhost:5000/api/blocked-slots/range?start=2026-01-01&end=2026-12-31
Authorization: Bearer {token}
```

## 🎯 Отладка конкретных проблем

### Календарь не показывает записи

1. Проверьте запрос в Network tab
2. Проверьте backend логи
3. Проверьте базу данных (psycho-site.db)

### Блокировка не создаётся

1. Проверьте запрос POST /api/blocked-slots
2. Проверьте формат даты (ISO 8601)
3. Проверьте логи контроллера

### Аутентификация не работает

1. Проверьте что токен отправляется в заголовке
2. Проверьте срок действия токена
3. Перевыпустите токен через login
