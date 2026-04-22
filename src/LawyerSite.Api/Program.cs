using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Diagnostics;
using System.Net.Sockets;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NSwag;
using LawyerSite.Api.Data;
using LawyerSite.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Обработка DateTime: используем конвертер для UTC
        options.JsonSerializerOptions.Converters.Add(new LawyerSite.Api.JsonStringDateTimeConverter());
        // Форматирование DateTime в ISO 8601
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });

// Services
builder.Services.AddScoped<IAppointmentService, AppointmentService>();
builder.Services.AddScoped<IArticleService, ArticleService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IBlockSlotService, BlockSlotService>();
builder.Services.AddScoped<IWorkingHoursService, WorkingHoursService>();
builder.Services.AddScoped<IServiceService, ServiceService>();

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// JWT Authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not configured");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
    };
});

builder.Services.AddAuthorization();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? new[] { "http://localhost:4200" })
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApiDocument(configure =>
{
    configure.Title = "LawyerSite API";
    configure.Version = "v1";
    configure.Description = "API для сайта адвоката";
    
    // Add JWT Bearer authentication
    configure.AddSecurity("Bearer", Enumerable.Empty<string>(), new NSwag.OpenApiSecurityScheme
    {
        Type = NSwag.OpenApiSecuritySchemeType.ApiKey,
        Name = "Authorization",
        In = NSwag.OpenApiSecurityApiKeyLocation.Header,
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token."
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    StartAngularDevServerIfNeeded(app);
}

// Ensure database is created
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.EnsureCreated();
    LawyerSite.Api.DbInitializer.Initialize(dbContext);
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseOpenApi(configure =>
    {
        configure.Path = "/api/specification.json";
    });

    app.UseSwaggerUi(configure =>
    {
        configure.ServerUrl = "/";
        configure.Path = "/api";
        configure.DocumentPath = "/api/specification.json";
    });
}

app.UseCors("AllowAngular");

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

// Serve uploaded files
app.UseStaticFiles();

app.MapControllers();

app.Run();

static void StartAngularDevServerIfNeeded(WebApplication app)
{
    // Goal: allow `dotnet run` to bring up both API and Angular dev-server.
    // If port 4200 is already in use (e.g., dev server running separately), do nothing.
    if (IsLocalPortOpen("127.0.0.1", 4200))
    {
        app.Logger.LogInformation("Angular dev server already running on http://localhost:4200.");
        return;
    }

    var frontendDir = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "LawyerSite.Web"));
    if (!Directory.Exists(frontendDir))
    {
        app.Logger.LogWarning("Frontend directory not found: {FrontendDir}. Skipping Angular startup.", frontendDir);
        return;
    }

    app.Logger.LogInformation("Starting Angular dev server (npm start) in {FrontendDir}...", frontendDir);

    ProcessStartInfo psi;
    if (OperatingSystem.IsWindows())
    {
        // On Windows, npm is typically available as npm.cmd and is resolved by cmd.exe.
        psi = new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = "/c npm start",
            WorkingDirectory = frontendDir,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };
    }
    else
    {
        psi = new ProcessStartInfo
        {
            FileName = "npm",
            Arguments = "start",
            WorkingDirectory = frontendDir,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };
    }

    var proc = new Process { StartInfo = psi, EnableRaisingEvents = true };

    proc.OutputDataReceived += (_, e) =>
    {
        if (!string.IsNullOrWhiteSpace(e.Data))
            app.Logger.LogInformation("[ng] {Line}", e.Data);
    };

    proc.ErrorDataReceived += (_, e) =>
    {
        if (!string.IsNullOrWhiteSpace(e.Data))
            app.Logger.LogWarning("[ng] {Line}", e.Data);
    };

    try
    {
        if (!proc.Start())
        {
            app.Logger.LogWarning("Failed to start Angular dev server process.");
            return;
        }
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Failed to start Angular dev server. Ensure Node/npm are installed and available in PATH.");
        return;
    }

    proc.BeginOutputReadLine();
    proc.BeginErrorReadLine();

    app.Lifetime.ApplicationStopping.Register(() =>
    {
        try
        {
            if (!proc.HasExited)
            {
                app.Logger.LogInformation("Stopping Angular dev server...");
                proc.Kill(entireProcessTree: true);
            }
        }
        catch (Exception ex)
        {
            app.Logger.LogWarning(ex, "Failed to stop Angular dev server.");
        }
    });
}

static bool IsLocalPortOpen(string host, int port)
{
    try
    {
        using var client = new TcpClient();
        var connectTask = client.ConnectAsync(host, port);
        return connectTask.Wait(TimeSpan.FromMilliseconds(200)) && client.Connected;
    }
    catch
    {
        return false;
    }
}
