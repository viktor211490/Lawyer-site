# Технология генерации API-клиента NSwag и архитектура взаимодействия Angular + .NET

## 📋 Обзор архитектуры проекта

### Структура проекта
```
dashboard/
├── dashboard.Server/          # .NET Web API backend
│   ├── Controllers/           # API контроллеры
│   ├── ConfigureServices.cs   # Регистрация сервисов
│   ├── Program.cs             # Точка входа
│   ├── nswag.json             # Конфигурация генерации клиента
│   └── web-api-client.ts      # Сгенерированный клиент (выход)
│
├── dashboard.client/          # Angular frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── services/client/
│   │   │   │   ├── templates/ # Liquid-шаблоны NSwag
│   │   │   │   └── web-api-client.ts  # Сгенерированный клиент
│   │   │   ├── core/auth/     # Auth модуль с OAuth2/OIDC
│   │   │   └── app.module.ts  # HTTP_INTERCEPTORS
│   │   └── proxy.conf.js      # Proxy для API запросов
│   └── package.json           # npm скрипты
│
└── Application/, Domain/, Infrastructure/  # Слои бизнес-логики
```

---

## 🔧 Принцип генерации клиента NSwag

### 1. Конфигурация nswag.json

**Путь:** `dashboard.Server/nswag.json`

```json
{
  "runtime": "Net80",
  "documentGenerator": {
    "aspNetCoreToOpenApi": {
      "project": "dashboard.Server.csproj",
      "output": "wwwroot/api/specification.json",
      "noBuild": true
    }
  },
  "codeGenerators": {
    "openApiToTypeScriptClient": {
      "template": "Angular",
      "className": "{controller}Client",
      "httpClass": "HttpClient",
      "withCredentials": true,
      "useSingletonProvider": true,
      "injectionTokenType": "InjectionToken",
      "generateClientClasses": true,
      "generateClientInterfaces": true,
      "generateOptionalParameters": true,
      "typeScriptVersion": 4.3,
      "rxJsVersion": 7.0,
      "dateTimeType": "Date",
      "typeStyle": "Interface",
      "enumStyle": "Enum",
      "templateDirectory": "../dashboard.client/src/app/services/client/templates",
      "output": "../dashboard.client/src/app/services/client/web-api-client.ts"
    }
  }
}
```

### 2. Процесс генерации (автоматический)

**Встроен в .csproj файл** (`dashboard.Server.csproj`):

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

**Как работает:**
1. При сборке проекта `dashboard.Server` в режиме **Debug**
2. После успешного завершения `PostBuildEvent`
3. Запускается `NSwagExe_Net80` с конфигом `nswag.json`
4. NSwag сканирует все контроллеры и генерирует OpenAPI спецификацию
5. На основе спецификации создаётся TypeScript клиент

### 3. Ручная генерация (альтернатива)

```bash
# Из директории dashboard.Server
nswag run nswag.json

# Или через dotnet tool
dotnet tool install -g NSwag.ConsoleCore
nswag run nswag.json
```

### 4. Что генерируется

**Файл:** `dashboard.client/src/app/services/client/web-api-client.ts`

**Структура:**
- **Интерфейсы** `I{Controller}Client` с типизированными методами
- **Классы** `{Controller}Client` с реализацией через `HttpClient`
- **DTO интерфейсы** для всех моделей данных
- **Enum** для перечислений

**Пример:**
```typescript
export interface IMetricClient {
    getById(metricId: number): Observable<MetricDto>;
    getAll(dto?: { search?: string | undefined; }): Observable<MetricDto[]>;
    create(dto: MetricDto): Observable<MetricDto>;
}

@Injectable({ providedIn: 'root' })
export class MetricClient implements IMetricClient {
    private http: HttpClient;
    private baseUrl: string;

    constructor(
        @Inject(HttpClient) http: HttpClient, 
        @Optional() @Inject(API_BASE_URL) baseUrl?: string
    ) {
        this.http = http;
        this.baseUrl = baseUrl ?? "https://localhost:7215";
    }

    getById(metricId: number): Observable<MetricDto> {
        let url_ = this.baseUrl + `/api/Metric/${metricId}`;
        return this.http.get(url_, { observe: 'response', responseType: 'blob' });
    }
}
```

### 5. Кастомизация через Liquid-шаблоны

**Путь:** `dashboard.client/src/app/services/client/templates/`

**Файлы шаблонов:**
| Шаблон | Назначение |
|--------|-----------|
| `File.Header.liquid` | Заголовок файла (комментарии, eslint) |
| `File.liquid` | Основной шаблон файла |
| `AngularClient.liquid` | Шаблон Angular-клиента |
| `Client.Method.Documentation.liquid` | JSDoc комментарии методов |
| `Client.RequestUrl.liquid` | Генерация URL запроса |
| `Client.RequestBody.liquid` | Формирование тела запроса |
| `Client.ProcessResponse.liquid` | Обработка ответа |

**Пример кастомизации** (`File.Header.liquid`):
```liquid
/* tslint:disable */
/* eslint-disable */
// ReSharper disable InconsistentNaming
```

---

## 🚀 Запуск бэкенда и фронтенда одновременно

### Вариант 1: Запуск через .NET (рекомендуемый)

```bash
# Из корня проекта
dotnet run --project dashboard.Server
```

**Что происходит:**
1. Запускается .NET Web API на `https://localhost:7215` (или другой порт из `launchSettings.json`)
2. .NET автоматически запускает Angular через `SpaProxy`
3. Angular Dev Server стартует на `https://localhost:56001`
4. Все запросы на `/api/*` проксируются на .NET

**Конфигурация в `.csproj`:**
```xml
<PropertyGroup>
  <SpaRoot>..\dashboard.client</SpaRoot>
  <SpaProxyLaunchCommand>npm start</SpaProxyLaunchCommand>
  <SpaProxyServerUrl>https://localhost:56001</SpaProxyServerUrl>
</PropertyGroup>
```

### Вариант 2: Раздельный запуск (для разработки)

**Терминал 1 - Бэкенд:**
```bash
cd dashboard.Server
dotnet watch run
```

**Терминал 2 - Фронтенд:**
```bash
cd dashboard.client
npm start
```

**Скрипт npm** (`dashboard.client/package.json`):
```json
{
  "scripts": {
    "prestart": "node aspnetcore-https",
    "start:windows": "ng serve --ssl --ssl-cert \"%APPDATA%\\ASP.NET\\https\\%npm_package_name%.pem\" --ssl-key \"%APPDATA%\\ASP.NET\\https\\%npm_package_name%.key\" --host=localhost --port=56001 -o",
    "start:default": "ng serve --ssl --ssl-cert \"$HOME/.aspnet/https/${npm_package_name}.pem\" --ssl-key \"$HOME/.aspnet/https/${npm_package_name}.key\" --host=localhost --port=56001"
  }
}
```

**Pre-скрипт** (`aspnetcore-https.js`):
- Генерирует HTTPS сертификат ASP.NET Core если отсутствует
- Сохраняет в `%APPDATA%\ASP.NET\https\` (Windows) или `~/.aspnet/https` (Linux/Mac)

---

## 🔄 Взаимодействие фронтенда и бэкенда

### 1. Proxy конфигурация (Angular Dev Server)

**Файл:** `dashboard.client/src/proxy.conf.js`

```javascript
const { env } = require('process');

const target = env.ASPNETCORE_HTTPS_PORT 
    ? `https://localhost:${env.ASPNETCORE_HTTPS_PORT}` 
    : env.ASPNETCORE_URLS 
        ? env.ASPNETCORE_URLS.split(';')[0] 
        : 'https://localhost:7215';

const PROXY_CONFIG = [
  {
    context: ["/api"],
    target,
    secure: false
  }
];

module.exports = PROXY_CONFIG;
```

**Как работает:**
- Все запросы на `/api/*` перенаправляются на .NET backend
- `secure: false` позволяет использовать self-signed сертификаты
- Порт берётся из переменных окружения или по умолчанию `7215`

**Подключение в `angular.json`:**
```json
"serve": {
  "builder": "@angular-devkit/build-angular:dev-server",
  "options": {
    "proxyConfig": "src/proxy.conf.js"
  }
}
```

### 2. HTTP клиент и перехватчики

**Модуль:** `dashboard.client/src/app/app.module.ts`

```typescript
@NgModule({
  imports: [
    HttpClientModule,
    // ...
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ]
})
export class AppModule {}
```

### 3. Auth Interceptor (JWT токены)

**Файл:** `dashboard.client/src/app/core/auth/auth-interceptor.ts`

```typescript
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private auth: AuthService,
    private oauthService: OAuthService,
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const urlsToSkip = [this.oauthService.issuer];
    const shouldSkip = urlsToSkip.some(url => url && request.url.startsWith(url));
    
    if (this.auth.hasValidToken() && !shouldSkip) {
      const clonedRequest = request.clone({
        setHeaders: {
          Authorization: `Bearer ${this.auth.accessToken}`,
        },
      });
      return next.handle(clonedRequest);
    }
    return next.handle(request);
  }
}
```

**Логика:**
1. Перехватывает все HTTP запросы
2. Пропускает запросы к Identity Provider (Keycloak)
3. Если есть валидный токен — добавляет `Authorization: Bearer <token>`
4. Продолжает запрос с модифицированными заголовками

### 4. Использование сгенерированного клиента

**Пример сервиса:**
```typescript
import { MetricClient, MetricDto } from './services/client/web-api-client';

@Injectable({ providedIn: 'root' })
export class MetricService {
  constructor(private metricClient: MetricClient) {}

  getMetrics(): Observable<MetricDto[]> {
    return this.metricClient.getAll();
  }

  getMetricById(id: number): Observable<MetricDto> {
    return this.metricClient.getById(id);
  }

  createMetric(dto: MetricDto): Observable<MetricDto> {
    return this.metricClient.create(dto);
  }
}
```

**Пример компонента:**
```typescript
@Component({ /* ... */ })
export class MetricListComponent implements OnInit {
  metrics: MetricDto[] = [];

  constructor(private metricService: MetricService) {}

  ngOnInit(): void {
    this.metricService.getMetrics().subscribe({
      next: (data) => this.metrics = data,
      error: (err) => console.error(err)
    });
  }
}
```

### 5. Бэкенд: Контроллеры

**Пример:** `dashboard.Server/Controllers/MetricController.cs`

```csharp
[ApiController]
[Route("api/[controller]")]
public class MetricController : ControllerBase
{
    private readonly IMetricService _metricService;

    public MetricController(IMetricService metricService)
    {
        _metricService = metricService;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<MetricDto>> GetById(int id)
    {
        return await _metricService.GetByIdAsync(id);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MetricDto>>> GetAll([FromQuery] MetricFilterDto filter)
    {
        return await _metricService.GetAllAsync(filter);
    }

    [HttpPost]
    public async Task<ActionResult<MetricDto>> Create([FromBody] MetricDto dto)
    {
        var result = await _metricService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }
}
```

**Важно:**
- `[ApiController]` — включает автоматическую валидацию
- `[Route("api/[controller]")]` — базовый путь `/api/Metric`
- Имя метода становится частью `operationId` для генерации имени метода в клиенте

### 6. Swagger/OpenAPI документация

**Настройка в `ConfigureServices.cs`:**
```csharp
services.AddOpenApiDocument(configure =>
{
    configure.Title = "Дашбоард";
    configure.AddSecurity("OAuth2", Enumerable.Empty<string>(), new OpenApiSecurityScheme
    {
        Type = OpenApiSecuritySchemeType.OAuth2,
        Name = "Authorization",
        Flows = new OpenApiOAuthFlows
        {
            Implicit = new OpenApiOAuthFlow
            {
                AuthorizationUrl = $"{configuration["AppSettings:Authority"]}/connect/authorize",
                Scopes = new Dictionary<string, string>
                {
                    { "uni-dashboard", "Dashboard API access" }
                }
            }
        }
    });
    configure.OperationProcessors.Add(new AspNetCoreOperationSecurityScopeProcessor("OAuth2"));
});
```

**В `Program.cs`:**
```csharp
if (app.Environment.IsDevelopment())
{
    app.UseOpenApi(api =>
    {
        api.Path = "/api/specification.json";
    });
    
    app.UseSwaggerUi(ui =>
    {
        ui.ServerUrl = "/";
        ui.Path = "/api";
        ui.DocumentPath = "/api/specification.json";
    });
}
```

**Доступ:**
- Swagger UI: `https://localhost:7215/api`
- OpenAPI JSON: `https://localhost:7215/api/specification.json`

---

## 📦 Зависимости

### Бэкенд (.NET)
```xml
<PackageReference Include="NSwag.AspNetCore" Version="14.4.0" />
<PackageReference Include="NSwag.CodeGeneration.TypeScript" Version="14.4.0" />
<PackageReference Include="NSwag.MSBuild" Version="14.4.0" />
<PackageReference Include="Microsoft.AspNetCore.SpaProxy" Version="9.0.5" />
<PackageReference Include="Microsoft.AspNetCore.SpaServices.Extensions" Version="9.0.5" />
```

### Фронтенд (Angular)
```json
{
  "dependencies": {
    "@angular/common/http": "^19.2.11",
    "@angular/core": "^19.2.11",
    "angular-oauth2-oidc": "^19.0.0",
    "rxjs": "~7.8.2"
  }
}
```

---

## 🎯 Промпт для применения на другом проекте

```
## Задача: Настроить генерацию TypeScript клиента NSwag и интеграцию Angular + .NET

### Контекст
У меня есть готовый проект с:
- .NET 9 Web API (бэкенд)
- Angular 19 (фронтенд)
- OAuth2/OpenID Connect аутентификация (Keycloak)

### Требуется

1. **Настроить NSwag для генерации TypeScript клиента**
   - Создать nswag.json в проекте API
   - Настроить генерацию OpenAPI спецификации из контроллеров
   - Настроить генерацию TypeScript клиента с Angular шаблоном
   - Интегрировать генерацию в процесс сборки (.csproj)
   - Создать кастомные Liquid шаблоны (опционально)

2. **Настроить SPA Proxy для совместного запуска**
   - Настроить запуск Angular из .NET проекта
   - Настроить проксирование API запросов
   - Настроить HTTPS сертификаты для разработки

3. **Настроить аутентификацию**
   - Auth Interceptor для добавления JWT токенов
   - OAuth2/OIDC интеграция с angular-oauth2-oidc

4. **Документировать процесс**
   - Команды для запуска
   - Структура проекта
   - Примеры использования клиента

### Технические детали

**NSwag конфигурация:**
- Runtime: Net80/Net90
- Template: Angular
- HttpClient с InjectionToken для baseUrl
- Singleton provider
- Генерация интерфейсов и классов
- RxJs 7.x, TypeScript 4.3+

**Angular:**
- Версия: 19.x
- HttpClient с interceptors
- OAuth2/OIDC через angular-oauth2-oidc

**.NET:**
- Версия: 9.0
- Minimal API или контроллеры
- Swagger/OpenAPI документация

### Ожидаемый результат
- Автоматическая генерация клиента при сборке
- Единая точка входа (dotnet run)
- Типизированные API вызовы
- Автоматическая подстановка JWT токенов
- Working Swagger UI
```

---

## 🛠️ Команды для разработки

### Сборка и запуск
```bash
# Запуск всего приложения (бэкенд + фронтенд)
dotnet run --project dashboard.Server

# Только бэкенд
cd dashboard.Server
dotnet watch run

# Только фронтенд
cd dashboard.client
npm start

# Сборка продакшн версии
cd dashboard.client
npm run build
```

### Миграции БД
```bash
# Add migration
dotnet ef migrations add <MigrationName> --startup-project dashboard.Server --project Infrastructure

# Update database
dotnet ef database update --startup-project dashboard.Server --project Infrastructure

# Remove last migration
dotnet ef migrations remove --startup-project dashboard.Server --project Infrastructure
```

### Генерация клиента
```bash
# Автоматически (при сборке Debug)
dotnet build dashboard.Server

# Вручную
cd dashboard.Server
nswag run nswag.json

# Пропустить генерацию при сборке
dotnet build -p:SkipNSwag=true
```

---

## 📝 Лучшие практики

1. **Именование контроллеров**
   - Используйте `[controller]` в route
   - Избегайте префиксов `Api`, `Controller` в имени класса
   - Пример: `MetricController` → `/api/Metric`

2. **DTO модели**
   - Создавайте отдельные DTO для запросов и ответов
   - Используйте nullable reference types
   - Добавляйте XML комментарии для документации

3. **Версионирование API**
   - Добавляйте версию в route: `api/v1/[controller]`
   - Обновляйте `documentName` в nswag.json

4. **Кастомизация клиента**
   - Храните шаблоны в репозитории
   - Версионируйте изменения шаблонов
   - Тестируйте после обновления NSwag

5. **Безопасность**
   - Не коммитьте сертификаты
   - Используйте переменные окружения для чувствительных данных
   - В продакшене включите `RequireHttpsMetadata = true`
