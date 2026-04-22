# NSwag Интеграция - PsychoSite Проект

## 📋 Обзор

Этот документ описывает настройку автоматической генерации TypeScript клиента для Angular на основе ASP.NET Core Web API с использованием NSwag.

---

## 🔧 Архитектура проекта

```
PsychoSite/
├── src/
│   ├── PsychoSite.Api/           # .NET 8 Web API backend
│   │   ├── Controllers/          # API контроллеры
│   │   ├── Program.cs            # Точка входа
│   │   ├── nswag.json            # Конфигурация генерации клиента
│   │   └── PsychoSite.Api.csproj # NSwag пакеты и таргеты
│   │
│   └── PsychoSite.Web/           # Angular 19 frontend
│       └── src/
│           └── app/
│               ├── services/
│               │   ├── client/
│               │   │   └── web-api-client.ts  # Сгенерированный клиент
│               │   ├── appointment.service.ts
│               │   ├── article.service.ts
│               │   └── ...
│               └── ...
```

---

## 🚀 Настройки

### 1. Бэкенд (.csproj)

**Файл:** `src/PsychoSite.Api/PsychoSite.Api.csproj`

Добавлены пакеты:
```xml
<PackageReference Include="NSwag.AspNetCore" Version="14.4.0" />
<PackageReference Include="NSwag.CodeGeneration.TypeScript" Version="14.4.0" />
<PackageReference Include="NSwag.MSBuild" Version="14.4.0" />
<PackageReference Include="Microsoft.AspNetCore.SpaProxy" Version="8.0.0" />
```

SPA Proxy настройки:
```xml
<PropertyGroup>
  <SpaRoot>..\PsychoSite.Web</SpaRoot>
  <SpaProxyLaunchCommand>npm start</SpaProxyLaunchCommand>
  <SpaProxyServerUrl>https://localhost:4200</SpaProxyServerUrl>
</PropertyGroup>
```

NSwag таргет для автогенерации:
```xml
<Target Name="NSwag" AfterTargets="PostBuildEvent" Condition=" '$(Configuration)' == 'Debug' And '$(SkipNSwag)' != 'True' ">
  <Exec ConsoleToMSBuild="true" ContinueOnError="true"
        WorkingDirectory="$(ProjectDir)"
        EnvironmentVariables="ASPNETCORE_ENVIRONMENT=Development"
        Command="$(NSwagExe_Net80) run nswag.json /variables:Configuration=$(Configuration)">
    <Output TaskParameter="ExitCode" PropertyName="NSwagExitCode" />
    <Output TaskParameter="ConsoleOutput" PropertyName="NSwagOutput" />
  </Exec>
  <Message Text="$(NSwagOutput)" Condition="'$(NSwagExitCode)' == '0'" Importance="low" />
  <Error Text="$(NSwagOutput)" Condition="'$(NSwagExitCode)' != '0'" />
</Target>
```

### 2. Конфигурация NSwag

**Файл:** `src/PsychoSite.Api/nswag.json`

```json
{
  "runtime": "Net80",
  "documentGenerator": {
    "aspNetCoreToOpenApi": {
      "project": "PsychoSite.Api.csproj",
      "output": "wwwroot/api/specification.json",
      "noBuild": true,
      "configuration": "$(Configuration)",
      "targetFramework": "net8.0",
      "generateDocument": true,
      "documentName": "v1",
      "aspNetCoreEnvironment": "Development"
    }
  },
  "codeGenerators": {
    "openApiToTypeScriptClient": {
      "className": "{controller}Client",
      "template": "Angular",
      "httpClass": "HttpClient",
      "withCredentials": true,
      "useSingletonProvider": true,
      "injectionTokenType": "InjectionToken",
      "rxJsVersion": "7.0",
      "typeScriptVersion": "4.3",
      "generateClientClasses": true,
      "generateClientInterfaces": true,
      "generateOptionalParameters": true,
      "generateConstructorInterface": true,
      "importRequiredTypes": true,
      "useGetBaseUrlMethod": false,
      "baseUrlTokenName": "API_BASE_URL",
      "throwExceptionOnError": true,
      "generateResponseClasses": true,
      "responseClass": "SwaggerResponse",
      "dateTimeType": "Date",
      "typeStyle": "Interface",
      "enumStyle": "Enum",
      "output": "../PsychoSite.Web/src/app/services/client/web-api-client.ts"
    }
  }
}
```

### 3. Фронтенд настройки

**Файл:** `src/PsychoSite.Web/package.json`

```json
{
  "scripts": {
    "start": "ng serve --proxy-config src/proxy.conf.js",
    "generate-client": "cd ../PsychoSite.Api && nswag run nswag.json"
  }
}
```

**Файл:** `src/PsychoSite.Web/src/proxy.conf.js`

```javascript
const { env } = require('process');

const target = env.ASPNETCORE_HTTPS_PORT
    ? `https://localhost:${env.ASPNETCORE_HTTPS_PORT}`
    : env.ASPNETCORE_URLS
        ? env.ASPNETCORE_URLS.split(';')[0]
        : 'https://localhost:5001';

const PROXY_CONFIG = [
    {
        context: ["/api", "/wwwroot"],
        target,
        secure: false,
        changeOrigin: true,
        logLevel: "debug"
    }
];

module.exports = PROXY_CONFIG;
```

---

## 📦 Сгенерированные клиенты

NSwag генерирует следующие клиенты на основе контроллеров:

| Контроллер | Клиент | Методы |
|------------|--------|--------|
| `AppointmentsController` | `AppointmentsClient` | `getAvailableSlots`, `getAll`, `create`, `getCalendar`, `getById`, `update`, `delete`, `updateStatus` |
| `ArticlesController` | `ArticlesClient` | `getAll`, `getById`, `create`, `update`, `delete`, `publish`, `toggleVisibility` |
| `AuthController` | `AuthClient` | `login`, `getProfile`, `logout` |
| `BlockedSlotsController` | `BlockedSlotsClient` | `getByRange`, `getDayDetails`, `create`, `delete` |
| `ServicesController` | `ServicesClient` | `getServices`, `getById`, `create`, `update`, `delete` |
| `WorkingHoursController` | `WorkingHoursClient` | `getWeek`, `saveWorkingHour` |

**Файл:** `src/PsychoSite.Web/src/app/services/client/web-api-client.ts`

---

## 🎯 Использование

### Вариант 1: Автоматическая генерация при сборке

При сборке проекта в режиме **Debug** клиент генерируется автоматически:

```bash
cd src/PsychoSite.Api
dotnet build
```

### Вариант 2: Ручная генерация

```bash
# Из проекта Angular
npm run generate-client

# Или напрямую через NSwag
cd src/PsychoSite.Api
nswag run nswag.json
```

### Вариант 3: Пропустить генерацию

```bash
dotnet build -p:SkipNSwag=true
```

---

## 💡 Примеры использования

### 1. Создание сервиса с использованием сгенерированного клиента

```typescript
// src/app/services/appointment.service.ts
import { Injectable, inject } from '@angular/core';
import { AppointmentsClient, CreateAppointmentDto, AppointmentResponseDto } from './client/web-api-client';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private client = inject(AppointmentsClient);

  getAvailableSlots(startDate?: Date, days?: number, serviceId?: number): Observable<any[]> {
    return this.client.getAvailableSlots(startDate, days, serviceId);
  }

  createAppointment(dto: CreateAppointmentDto): Observable<AppointmentResponseDto> {
    return this.client.create(dto);
  }
}
```

### 2. Использование в компоненте

```typescript
// src/app/pages/booking/booking.component.ts
import { Component, OnInit } from '@angular/core';
import { AppointmentService } from '../../services/appointment.service';

@Component({ /* ... */ })
export class BookingComponent implements OnInit {
  availableSlots: any[] = [];

  constructor(private appointmentService: AppointmentService) {}

  ngOnInit(): void {
    this.appointmentService.getAvailableSlots(new Date(), 7)
      .subscribe({
        next: (slots) => this.availableSlots = slots,
        error: (err) => console.error(err)
      });
  }
}
```

---

## 🔐 Аутентификация

### Настройка JWT Bearer в Swagger/OpenAPI

**Файл:** `src/PsychoSite.Api/Program.cs`

```csharp
builder.Services.AddOpenApiDocument(configure =>
{
    configure.Title = "PsychoSite API";
    configure.Version = "v1";
    configure.Description = "API для сайта частного психолога";
    
    // Add JWT Bearer authentication
    configure.AddSecurity("Bearer", Enumerable.Empty<string>(), new NSwag.OpenApiSecurityScheme
    {
        Type = NSwag.OpenApiSecuritySchemeType.ApiKey,
        Name = "Authorization",
        In = NSwag.OpenApiSecurityApiKeyLocation.Header,
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token."
    });
});
```

### Auth Interceptor (опционально)

Для автоматической подстановки JWT токенов создайте interceptor:

```typescript
// src/app/core/auth/auth.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const token = this.auth.getToken();
    
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    return next.handle(req);
  }
}
```

---

## 🛠️ Команды для разработки

### Запуск всего приложения

```bash
# Из корня проекта
dotnet run --project src/PsychoSite.Api
```

Это запустит:
- .NET API на `https://localhost:5001`
- Angular Dev Server на `https://localhost:4200` (через SpaProxy)

### Раздельный запуск

**Терминал 1 - Бэкенд:**
```bash
cd src/PsychoSite.Api
dotnet watch run
```

**Терминал 2 - Фронтенд:**
```bash
cd src/PsychoSite.Web
npm start
```

### Swagger UI

Доступен по адресу: `https://localhost:5001/api`

OpenAPI спецификация: `https://localhost:5001/api/specification.json`

---

## 📝 Лучшие практики

1. **Не редактируйте `web-api-client.ts` вручную** - он будет перезаписан при следующей генерации

2. **Создавайте обёрточные сервисы** для работы с клиентами:
   ```typescript
   @Injectable({ providedIn: 'root' })
   export class AppointmentService {
     private client = inject(AppointmentsClient);
     // Бизнес-логика здесь
   }
   ```

3. **Используйте интерфейсы** для типизации:
   ```typescript
   import { IAppointmentsClient } from './client/web-api-client';
   ```

4. **Версионируйте API** через контроллеры:
   ```csharp
   [Route("api/v1/[controller]")]
   [ApiController]
   public class AppointmentsV1Controller : ControllerBase { }
   ```

5. **Добавляйте XML комментарии** для документации:
   ```csharp
   /// <summary>
   /// Получить доступные слоты
   /// </summary>
   [HttpGet("slots")]
   public async Task<ActionResult<IEnumerable<TimeSlotDto>>> GetSlots() { }
   ```

---

## 🔧 Troubleshooting

### Ошибка генерации клиента

1. Проверьте что все контроллеры имеют `[ApiController]` атрибут
2. Убедитесь что `nswag.json` указывает правильный путь к проекту
3. Запустите вручную: `nswag run nswag.json`

### Клиент генерируется пустым

1. Проверьте что OpenAPI спецификация генерируется: `wwwroot/api/specification.json`
2. Убедитесь что контроллеры публичные и имеют маршруты
3. Проверьте логи сборки

### Ошибки CORS

Убедитесь что CORS настроен в `Program.cs`:
```csharp
app.UseCors("AllowAngular");
```

---

## 📚 Дополнительные ресурсы

- [NSwag Documentation](https://github.com/RicoSuter/NSwag)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Angular HttpClient](https://angular.io/guide/http)
