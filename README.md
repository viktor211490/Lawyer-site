# LawyerSite

Full-stack приложение: **ASP.NET Core Web API + Angular**.

Тематика проекта: **сайт адвоката** (Алексеева Татьяна Владимировна).

## Структура репозитория
- **`backend/`**: Clean Architecture (`Domain` / `Application` / `Infrastructure` / `Api`)
- **`frontend/`**: Angular приложение (`frontend/LawyerSite.Web`)
- **`docs/`**: инструкции и гайды

## Технологии
- **Backend**: ASP.NET Core 10, EF Core, SQLite, JWT, BCrypt, NSwag
- **Frontend**: Angular 21, RxJS, SCSS

## Запуск (Dev)

### Visual Studio (F5)
Открой `LawyerSite.slnx` и запусти `backend/LawyerSite.Api` — **поднимется API**, затем **Angular dev server**, и откроется браузер на `http://localhost:4200/`.

### CLI

Backend:

```bash
cd backend/LawyerSite.Api
dotnet run
```

Frontend:

```bash
cd frontend/LawyerSite.Web
npm install
npm start
```

## Swagger (Dev)
- **UI**: `/api`
- **OpenAPI json**: `/api/specification.json`

## Publish (Prod)
Backend собирает Angular и копирует его в `wwwroot` при publish:

```bash
dotnet publish backend/LawyerSite.Api/LawyerSite.Api.csproj -c Release
```

## 🔐 Учётные данные администратора

По умолчанию создаётся следующий администратор:

- **Логин:** `admin`
- **Email:** `admin@lawyer-site.ru`
- **Пароль:** `admin123`

⚠️ **Важно:** Смените пароль после первого входа!

## 📁 Структура проекта

```
Lawyer-site/
├── src/
│   ├── LawyerSite.Api/          # Backend (ASP.NET Core)
│   │   ├── Controllers/         # API контроллеры
│   │   ├── Domain/              # Модели домена
│   │   ├── Data/                # DbContext
│   │   ├── Services/            # Бизнес-логика
│   │   ├── DTOs/                # Data Transfer Objects
│   │   └── Program.cs           # Точка входа
│   │
│   └── LawyerSite.Web/          # Frontend (Angular)
│       ├── src/
│       │   ├── app/
│       │   │   ├── components/  # Общие компоненты
│       │   │   ├── pages/       # Страницы приложения
│       │   │   ├── services/    # Сервисы
│       │   │   ├── guards/      # Guards
│       │   │   ├── interceptors/# HTTP интерсепторы
│       │   │   └── models/      # TypeScript модели
│       │   ├── styles.scss      # Глобальные стили
│       │   └── main.ts          # Точка входа
│       └── proxy.conf.json      # Proxy для API
│
└── README.md
```

## 🎨 Цветовая палитра "Юридическая"

```css
--bg-primary: #F7F8FB;
--bg-secondary: #FFFFFF;

--accent-sage: #1F3A5F;       /* основной акцент */
--accent-sage-light: #D7E1F0; /* бордеры/фоновые акценты */
--accent-peach: #C6A15B;      /* вторичный акцент */
--accent-peach-light: #EAD9B9;

--text-primary: #101828;
--text-secondary: #344054;
--text-muted: #667085;
```

## 📡 API Endpoints

### Аутентификация
- `POST /api/auth/login` - Вход в админ-панель
- `GET /api/auth/me` - Получить текущий профиль
- `POST /api/auth/logout` - Выход

### Записи
- `GET /api/appointments/slots` - Доступные слоты для записи
- `GET /api/appointments` - Все записи (admin)
- `GET /api/appointments/calendar` - Календарь записей (admin)
- `GET /api/appointments/:id` - Получить запись по ID (admin)
- `POST /api/appointments` - Создать запись
- `PUT /api/appointments/:id` - Обновить запись (admin)
- `PATCH /api/appointments/:id/status` - Обновить статус (admin)
- `DELETE /api/appointments/:id` - Удалить запись (admin)

### Статьи
- `GET /api/articles/blog` - Статьи для блога (публично)
- `GET /api/articles/:id` - Получить статью по ID
- `GET /api/articles` - Все статьи (admin)
- `POST /api/articles` - Создать статью (admin)
- `PUT /api/articles/:id` - Обновить статью (admin)
- `POST /api/articles/:id/publish` - Опубликовать (admin)
- `POST /api/articles/:id/schedule` - Запланировать (admin)
- `POST /api/articles/:id/toggle-visibility` - Переключить видимость (admin)
- `DELETE /api/articles/:id` - Удалить статью (admin)
- `POST /api/articles/upload-image` - Загрузить изображение (admin)

## 📝 Модели данных

### Appointment (Запись)
```csharp
{
  id: number,
  clientName: string,
  clientEmail: string,
  clientPhone: string,
  appointmentTime: DateTime,
  durationMinutes: number (60),
  notes?: string,
  status: AppointmentStatus (Scheduled/Confirmed/Cancelled/Completed),
  isBlocked: boolean,
  blockReason?: string
}
```

### Article (Статья)
```csharp
{
  id: number,
  title: string,
  content: string,
  excerpt: string,
  coverImage?: string,
  authorName: string,
  publishedDate: DateTime,
  isPublished: boolean,
  isVisibleInBlog: boolean,
  status: ArticleStatus (Draft/Published/Hidden/Scheduled),
  scheduledAt?: DateTime
}
```

## 🔧 Конфигурация

### Backend (appsettings.json)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=lawyer-site.db"
  },
  "Jwt": {
    "SecretKey": "ваш-секретный-ключ",
    "Issuer": "LawyerSite.Api",
    "Audience": "LawyerSite.Frontend",
    "ExpirationMinutes": 1440
  }
}
```

### Frontend (proxy.conf.json)
```json
{
  "/api": {
    "target": "http://localhost:5000",
    "secure": false,
    "changeOrigin": true
  }
}
```

## 🗄️ Миграции базы данных

### Подготовка

**Важно:** Для работы с миграциями в Visual Studio установите пакет EF Core Tools:

```bash
# Через .NET CLI (если не установлен)
dotnet add package Microsoft.EntityFrameworkCore.Tools --version 8.0.0
```

Пакет уже добавлен в `LawyerSite.Api.csproj`, но если вы используете Package Manager Console и получаете ошибку, выполните:

```powershell
# В Package Manager Console
Install-Package Microsoft.EntityFrameworkCore.Tools -Version 8.0.0
```

### Создание новой миграции

**Вариант 1: .NET CLI (командная строка, терминал)**

```bash
# Перейдите в папку проекта API
cd backend/LawyerSite.Api

# Создайте миграцию
dotnet ef migrations add <ИмяМиграции>
```

**Пример:**
```bash
dotnet ef migrations add AddServicesTable
```

**Вариант 2: Package Manager Console (Visual Studio)**

1. Откройте **Package Manager Console**:  
   `Tools` → `NuGet Package Manager` → `Package Manager Console`

2. Убедитесь, что в поле **Default project** выбран **LawyerSite.Api**

3. Выполните команду:
```powershell
Add-Migration <ИмяМиграции>
```

**Пример:**
```powershell
Add-Migration AddServicesTable
```

> ⚠️ **Ошибка "Имя не распознано":** Если получаете ошибку `add-migration : Имя "add-migration" не распознано...`, значит не установлен пакет `Microsoft.EntityFrameworkCore.Tools`. Установите его как показано выше в разделе "Подготовка".

### Применение миграций

**Вариант 1: .NET CLI**
```bash
cd src/LawyerSite.Api
dotnet ef database update
```

**Вариант 2: Package Manager Console**
```powershell
# Убедитесь, что выбран проект LawyerSite.Api
Update-Database
```

### Удаление последней миграции

**Вариант 1: .NET CLI**
```bash
dotnet ef migrations remove
```

**Вариант 2: Package Manager Console**
```powershell
Remove-Migration
```

### Просмотр установленных миграций

**Вариант 1: .NET CLI**
```bash
dotnet ef migrations list
```

**Вариант 2: Package Manager Console**
```powershell
Get-Migration
```

### Применение конкретной миграции

**Вариант 1: .NET CLI**
```bash
dotnet ef database update <ИмяМиграции>
```

**Вариант 2: Package Manager Console**
```powershell
Update-Database -Target <ИмяМиграции>
```

### Удаление всех миграций и сброс БД

```bash
# Удалите файл базы данных
cd src/LawyerSite.Api
del lawyer-site.db

# Или через .NET CLI
dotnet ef database drop --force

# Затем примените все миграции заново
dotnet ef database update
```

## 📱 Адаптивность

Приложение полностью адаптировано для мобильных устройств:
- Мобильная версия календаря записи
- Адаптивная навигация
- Оптимизированные формы

## 🚀 Развёртывание

### Production Backend
```bash
dotnet publish -c Release -o ./publish
# Настройте веб-сервер (IIS, Nginx, Apache)
```

### Production Frontend
```bash
npm run build
# Скопируйте содержимое dist/ на веб-сервер
```

## 📝 Лицензия

Частный проект. Все права защищены.

## 👤 Контакты

- **Адвокат:** Алексеева Татьяна Владимировна
- **Адрес:** г. Симферополь, ул. Битакская, 88
- **Телефон:** +7 9787904690
- **Email:** alexeevaadv.gmail.com
