using BCrypt.Net;
using PsychoSite.Api.Data;
using PsychoSite.Api.Domain;

namespace PsychoSite.Api;

public static class DbInitializer
{
    public static void Initialize(AppDbContext context)
    {
        // Создаем админа по умолчанию если нет пользователей
        if (!context.AdminUsers.Any())
        {
            var admin = new AdminUser
            {
                Username = "admin",
                Email = "admin@psycho-site.ru",
                FullName = "Алексеева Мария Викторовна",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"), // Пароль по умолчанию
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            
            context.AdminUsers.Add(admin);
            context.SaveChanges();
        }
        
        // Создаем тестовые статьи если нет статей
        if (!context.Articles.Any())
        {
            var articles = new List<Article>
            {
                new Article
                {
                    Title = "Как справиться с тревожностью: 5 практических советов",
                    Excerpt = "Тревожность — нормальное состояние, но иногда она выходит из-под контроля. Вот 5 работающих техник.",
                    Content = @"<p>Тревожность — это нормальное эмоциональное состояние, которое помогает нам реагировать на опасность. Однако когда тревога становится хронической, она может мешать повседневной жизни.</p>
                    
<h2>1. Дыхательные упражнения</h2>
<p>Глубокое диафрагмальное дыхание помогает активировать парасимпатическую нервную систему и снизить уровень стресса.</p>

<h2>2. Техника заземления 5-4-3-2-1</h2>
<p>Найдите 5 вещей, которые вы видите, 4 которые можете потрогать, 3 которые слышите, 2 которые чувствуете по запаху и 1 которую можете попробовать на вкус.</p>

<h2>3. Физическая активность</h2>
<p>Регулярные упражнения снижают уровень кортизола и повышают выработку эндорфинов.</p>

<h2>4. Ограничение кофеина</h2>
<p>Кофеин может усиливать симптомы тревоги. Попробуйте заменить кофе на травяной чай.</p>

<h2>5. Практика осознанности</h2>
<p>Медитация и mindfulness помогают оставаться в настоящем моменте и снижать тревожные мысли о будущем.</p>

<p>Если тревожность мешает вашей повседневной жизни, обратитесь к специалисту.</p>",
                    AuthorId = "admin",
                    AuthorName = "Алексеева Мария Викторовна",
                    PublishedDate = DateTime.UtcNow.AddDays(-5),
                    IsPublished = true,
                    IsVisibleInBlog = true,
                    Status = ArticleStatus.Published,
                    CreatedAt = DateTime.UtcNow.AddDays(-7),
                    UpdatedAt = DateTime.UtcNow.AddDays(-5)
                },
                new Article
                {
                    Title = "Эмоциональное выгорание: признаки и пути восстановления",
                    Excerpt = "Как распознать выгорание на ранней стадии и что делать для восстановления ресурсов.",
                    Content = @"<p>Эмоциональное выгорание — это состояние физического, эмоционального и умственного истощения, вызванное длительным стрессом.</p>
                    
<h2>Признаки выгорания</h2>
<ul>
    <li>Хроническая усталость</li>
    <li>Потеря мотивации</li>
    <li>Раздражительность</li>
    <li>Трудности с концентрацией</li>
    <li>Нарушения сна</li>
</ul>

<h2>Пути восстановления</h2>
<p>Восстановление от выгорания требует времени и комплексного подхода.</p>

<h3>1. Признание проблемы</h3>
<p>Первый шаг — признать, что выгорание существует и требует внимания.</p>

<h3>2. Границы между работой и отдыхом</h3>
<p>Установите четкие границы рабочего времени и времени на восстановление.</p>

<h3>3. Забота о себе</h3>
<p>Регулярный сон, питание и физическая активность — основа восстановления.</p>

<p>Не стесняйтесь обращаться за профессиональной помощью.</p>",
                    AuthorId = "admin",
                    AuthorName = "Алексеева Мария Викторовна",
                    PublishedDate = DateTime.UtcNow.AddDays(-2),
                    IsPublished = true,
                    IsVisibleInBlog = true,
                    Status = ArticleStatus.Published,
                    CreatedAt = DateTime.UtcNow.AddDays(-3),
                    UpdatedAt = DateTime.UtcNow.AddDays(-2)
                }
            };
            
            context.Articles.AddRange(articles);
            context.SaveChanges();
        }
        
        // Создаем рабочие часы по умолчанию если нет записей
        if (!context.WorkingHours.Any())
        {
            var workingHours = new List<WorkingHour>
            {
                new WorkingHour { DayOfWeek = DayOfWeekEnum.Monday, StartHour = 9, EndHour = 18, IsWorkingDay = true, SlotDurationMinutes = 15, BreakBetweenSlotsMinutes = 15 },
                new WorkingHour { DayOfWeek = DayOfWeekEnum.Tuesday, StartHour = 9, EndHour = 18, IsWorkingDay = true, SlotDurationMinutes = 15, BreakBetweenSlotsMinutes = 15 },
                new WorkingHour { DayOfWeek = DayOfWeekEnum.Wednesday, StartHour = 9, EndHour = 18, IsWorkingDay = true, SlotDurationMinutes = 15, BreakBetweenSlotsMinutes = 15 },
                new WorkingHour { DayOfWeek = DayOfWeekEnum.Thursday, StartHour = 9, EndHour = 18, IsWorkingDay = true, SlotDurationMinutes = 15, BreakBetweenSlotsMinutes =  15},
                new WorkingHour { DayOfWeek = DayOfWeekEnum.Friday, StartHour = 9, EndHour = 18, IsWorkingDay = true, SlotDurationMinutes = 15, BreakBetweenSlotsMinutes = 15 },
                new WorkingHour { DayOfWeek = DayOfWeekEnum.Saturday, StartHour = 9, EndHour = 18, IsWorkingDay = false, SlotDurationMinutes = 15, BreakBetweenSlotsMinutes = 15 },
                new WorkingHour { DayOfWeek = DayOfWeekEnum.Sunday, StartHour = 9, EndHour = 18, IsWorkingDay = false, SlotDurationMinutes = 15, BreakBetweenSlotsMinutes = 15 }
            };

            context.WorkingHours.AddRange(workingHours);
            context.SaveChanges();
        }

        // Создаем услуги по умолчанию если нет
        if (!context.Services.Any())
        {
            var services = new List<Service>
            {
                new Service
                {
                    Title = "Индивидуальная консультация",
                    Description = "Персональная консультация психолога для работы с личными запросами",
                    Price = 5000,
                    DurationMinutes = 60,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Service
                {
                    Title = "Семейная терапия",
                    Description = "Консультация для пар и семей по разрешению конфликтов и улучшению отношений",
                    Price = 8000,
                    DurationMinutes = 90,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Service
                {
                    Title = "Первичная диагностика",
                    Description = "Первичная консультация для сбора анамнеза и определения дальнейшего плана работы",
                    Price = 7000,
                    DurationMinutes = 120,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            };

            context.Services.AddRange(services);
            context.SaveChanges();
        }
    }
}
