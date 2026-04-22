# Сайт частного психолога | PsychoSite

Full-stack приложение для сайта частного психолога Алексеевой Марии Викторовны с системой записи на приём, админ-панелью и блогом.

## 🚀 Технологии

### Backend
- **ASP.NET Core 10** - Web API
- **Entity Framework Core** - ORM
- **SQLite** - База данных
- **JWT** - Аутентификация
- **BCrypt** - Хэширование паролей

### Frontend
- **Angular 19** - Фронтенд фреймворк
- **RxJS** - Реактивное программирование
- **SCSS** - Стилизация
- **date-fns** - Работа с датами

## 📋 Функционал

### Публичная часть
- **Главная страница** - Информация о психологе, услуги, статистика
- **Блог** - Список статей о психологии
- **Страница статьи** - Просмотр полной статьи
- **Запись на приём** - Календарь доступных слотов, форма записи

### Админ-панель
- **Аутентификация** - Вход по логину/паролю
- **Календарь записей** - Просмотр записей на месяц, управление статусами
- **Управление статьями** - Создание, редактирование, публикация статей
- **Загрузка изображений** - Drag-and-drop загрузка картинок для статей

## 🛠 Установка и запуск

### Требования
- .NET 10 SDK
- Node.js 18+
- npm 9+

### Backend

```bash
# Перейдите в папку backend
cd src/PsychoSite.Api

# Восстановите пакеты
dotnet restore

# Запустите сервер
dotnet run

# Backend доступен по адресу: http://localhost:5000
# Swagger: http://localhost:5000/swagger
```

### Frontend

```bash
# Перейдите в папку frontend
cd src/PsychoSite.Web

# Установите зависимости
npm install

# Запустите сервер разработки
npm run start

# Frontend доступен по адресу: http://localhost:4200
```

## 🔐 Учётные данные администратора

По умолчанию создаётся следующий администратор:

- **Логин:** `admin`
- **Email:** `admin@psycho-site.ru`
- **Пароль:** `admin123`

⚠️ **Важно:** Смените пароль после первого входа!

## 📁 Структура проекта

```
Psycho-site/
├── src/
│   ├── PsychoSite.Api/          # Backend (ASP.NET Core)
│   │   ├── Controllers/         # API контроллеры
│   │   ├── Domain/              # Модели домена
│   │   ├── Data/                # DbContext
│   │   ├── Services/            # Бизнес-логика
│   │   ├── DTOs/                # Data Transfer Objects
│   │   └── Program.cs           # Точка входа
│   │
│   └── PsychoSite.Web/          # Frontend (Angular)
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

## 🎨 Цветовая палитра "Осознанность"

```css
--bg-primary: #FFF9F0;      /* Воздушный крем */
--bg-secondary: #FAF3E8;

--accent-sage: #B7C9B7;     /* Мягкий шалфей */
--accent-sage-light: #D4E2D4;
--accent-peach: #FAD5B5;    /* Теплый персик */
--accent-peach-light: #F3CFB3;

--text-primary: #2F3E2F;    /* Глубокий лесной */
--text-secondary: #4A5A4A;
--text-muted: #6A7A6A;
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
    "DefaultConnection": "Data Source=psycho-site.db"
  },
  "Jwt": {
    "SecretKey": "ваш-секретный-ключ",
    "Issuer": "PsychoSite.Api",
    "Audience": "PsychoSite.Frontend",
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

Пакет уже добавлен в `PsychoSite.Api.csproj`, но если вы используете Package Manager Console и получаете ошибку, выполните:

```powershell
# В Package Manager Console
Install-Package Microsoft.EntityFrameworkCore.Tools -Version 8.0.0
```

### Создание новой миграции

**Вариант 1: .NET CLI (командная строка, терминал)**

```bash
# Перейдите в папку проекта API
cd c:\Users\alexe\repos\Psycho-site\src\PsychoSite.Api

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

2. Убедитесь, что в поле **Default project** выбран **PsychoSite.Api**

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
cd src/PsychoSite.Api
dotnet ef database update
```

**Вариант 2: Package Manager Console**
```powershell
# Убедитесь, что выбран проект PsychoSite.Api
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
cd src/PsychoSite.Api
del psycho-site.db

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

- **Психолог:** Алексеева Мария Викторовна
- **Email:** info@psycho-site.ru
- **Телефон:** +7 (999) 123-45-67
