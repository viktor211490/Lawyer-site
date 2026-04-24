using LawyerSite.Domain.Entities;
using LawyerSite.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace LawyerSite.Infrastructure.Persistence;

public static class DbInitializer
{
    public static void Initialize(AppDbContext context)
    {
        EnsureSchema(context);

        // Создаем админа по умолчанию если нет пользователей
        if (!context.AdminUsers.Any())
        {
            var admin = new AdminUser
            {
                Username = "admin",
                Email = "admin@lawyer-site.ru",
                FullName = "Алексеева Татьяна Владимировна",
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
                    Title = "Как подготовиться к судебному заседанию",
                    Excerpt = "Короткий чек-лист: документы, позиция, поведение в зале и что важно уточнить заранее у суда и оппонента.",
                    Content = @"<p>Подготовка к судебному заседанию — это не только документы, но и стратегия. Чем лучше вы понимаете процесс, тем спокойнее и увереннее ведёте себя в зале суда.</p>

<h2>1. Проверьте комплект документов</h2>
<ul>
    <li>Иск/отзыв и приложения (копии для суда и сторон)</li>
    <li>Доказательства (оригиналы при себе, копии в материал дела)</li>
    <li>Доверенность/ордер, если вы действуете через представителя</li>
    <li>Квитанции госпошлины, уведомления, переписка</li>
</ul>

<h2>2. Сформулируйте позицию простыми тезисами</h2>
<p>Подготовьте 5–7 ключевых тезисов: что просите, на чём основано, какие доказательства подтверждают вашу позицию.</p>

<h2>3. Подготовьтесь к вопросам</h2>
<p>Суд уточняет факты и противоречия. Продумайте ответы на неудобные вопросы и заранее уточните даты, суммы, последовательность событий.</p>

<h2>4. Поведение в заседании</h2>
<p>Говорите кратко, по существу, соблюдайте регламент, не перебивайте. Если нужно время, попросите перерыв для подготовки пояснений.</p>

<p>Если вы сомневаетесь, какие доказательства нужны и как выстроить позицию, лучше обсудить дело на консультации до заседания.</p>",
                    AuthorId = "admin",
                    AuthorName = "Алексеева Татьяна Владимировна",
                    PublishedDate = DateTime.UtcNow.AddDays(-5),
                    IsPublished = true,
                    IsVisibleInBlog = true,
                    Status = ArticleStatus.Published,
                    CreatedAt = DateTime.UtcNow.AddDays(-7),
                    UpdatedAt = DateTime.UtcNow.AddDays(-5)
                },
                new Article
                {
                    Title = "Раздел имущества: частые ошибки",
                    Excerpt = "Пять типичных ошибок при разделе имущества супругов и как их избежать ещё до подачи иска.",
                    Content = @"<p>Раздел имущества — один из самых конфликтных этапов при разводе. Часто люди теряют время и деньги из‑за процессуальных ошибок и неверных ожиданий.</p>

<h2>Частые ошибки</h2>
<ul>
    <li><strong>Не фиксируют состав имущества</strong> и не собирают документы заранее.</li>
    <li><strong>Путают личное и совместно нажитое</strong> (дарение, наследство, имущество до брака).</li>
    <li><strong>Игнорируют долги и кредиты</strong>, хотя обязательства тоже могут делиться.</li>
    <li><strong>Затягивают сроки</strong> и пропускают важные процессуальные действия.</li>
    <li><strong>Ставят неверные требования</strong> вместо того, чтобы просить конкретный способ раздела.</li>
</ul>

<p>До обращения в суд полезно оценить доказательства, риски и возможные варианты мирового соглашения.</p>",
                    AuthorId = "admin",
                    AuthorName = "Алексеева Татьяна Владимировна",
                    PublishedDate = DateTime.UtcNow.AddDays(-2),
                    IsPublished = true,
                    IsVisibleInBlog = true,
                    Status = ArticleStatus.Published,
                    CreatedAt = DateTime.UtcNow.AddDays(-3),
                    UpdatedAt = DateTime.UtcNow.AddDays(-2)
                },
                new Article
                {
                    Title = "Досудебная претензия: когда нужна и как составить",
                    Excerpt = "Зачем нужна претензия, что в неё включить и какие ошибки чаще всего лишают её смысла.",
                    Content = @"<p>Во многих спорах досудебная претензия — обязательный этап перед обращением в суд. Даже когда это не требуется законом, претензия помогает зафиксировать позицию и попытаться урегулировать конфликт.</p>

<h2>Когда претензия обязательна</h2>
<p>Чаще всего — по отдельным категориям споров (например, с перевозчиками, по договорным обязательствам, в рамках специальных процедур). Важно проверить закон и условия договора.</p>

<h2>Что включить</h2>
<ul>
    <li>Кто и кому направляет (реквизиты сторон)</li>
    <li>Описание обстоятельств и ссылки на договор/доказательства</li>
    <li>Требования (сумма, сроки, способ исполнения)</li>
    <li>Срок для ответа</li>
    <li>Перечень приложений</li>
</ul>

<p>Лучше направлять претензию с подтверждением отправки и получения (заказное письмо/курьер/ЭДО).</p>",
                    AuthorId = "admin",
                    AuthorName = "Алексеева Татьяна Владимировна",
                    PublishedDate = DateTime.UtcNow.AddDays(-1),
                    IsPublished = true,
                    IsVisibleInBlog = true,
                    Status = ArticleStatus.Published,
                    CreatedAt = DateTime.UtcNow.AddDays(-2),
                    UpdatedAt = DateTime.UtcNow.AddDays(-1)
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
                new WorkingHour { DayOfWeek = DayOfWeekEnum.Monday, StartHour = 10, StartMinute = 0, EndHour = 19, EndMinute = 0, IsWorkingDay = true, SlotDurationMinutes = 30, BreakBetweenSlotsMinutes = 0 },
                new WorkingHour { DayOfWeek = DayOfWeekEnum.Tuesday, StartHour = 10, StartMinute = 0, EndHour = 19, EndMinute = 0, IsWorkingDay = true, SlotDurationMinutes = 30, BreakBetweenSlotsMinutes = 0 },
                new WorkingHour { DayOfWeek = DayOfWeekEnum.Wednesday, StartHour = 10, StartMinute = 0, EndHour = 19, EndMinute = 0, IsWorkingDay = true, SlotDurationMinutes = 30, BreakBetweenSlotsMinutes = 0 },
                new WorkingHour { DayOfWeek = DayOfWeekEnum.Thursday, StartHour = 10, StartMinute = 0, EndHour = 19, EndMinute = 0, IsWorkingDay = true, SlotDurationMinutes = 30, BreakBetweenSlotsMinutes = 0 },
                new WorkingHour { DayOfWeek = DayOfWeekEnum.Friday, StartHour = 10, StartMinute = 0, EndHour = 19, EndMinute = 0, IsWorkingDay = true, SlotDurationMinutes = 30, BreakBetweenSlotsMinutes = 0 },
                new WorkingHour { DayOfWeek = DayOfWeekEnum.Saturday, StartHour = 10, StartMinute = 0, EndHour = 19, EndMinute = 0, IsWorkingDay = false, SlotDurationMinutes = 30, BreakBetweenSlotsMinutes = 0 },
                new WorkingHour { DayOfWeek = DayOfWeekEnum.Sunday, StartHour = 10, StartMinute = 0, EndHour = 19, EndMinute = 0, IsWorkingDay = false, SlotDurationMinutes = 30, BreakBetweenSlotsMinutes = 0 }
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
                    Title = "Консультация по семейным спорам",
                    Description = "Анализ ситуации, стратегия и рекомендации по семейным спорам (развод, алименты, порядок общения с ребёнком).",
                    Price = 6000,
                    DurationMinutes = 60,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Service
                {
                    Title = "Подготовка искового заявления",
                    Description = "Подготовка иска, сбор списка доказательств, рекомендации по подаче и дальнейшим шагам.",
                    Price = 12000,
                    DurationMinutes = 90,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Service
                {
                    Title = "Представительство в суде",
                    Description = "Участие в судебных заседаниях, подготовка процессуальных документов, защита позиции клиента.",
                    Price = 15000,
                    DurationMinutes = 120,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Service
                {
                    Title = "Сопровождение сделок с недвижимостью",
                    Description = "Проверка документов, рисков и условий сделки; рекомендации по безопасному оформлению.",
                    Price = 14000,
                    DurationMinutes = 90,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            };

            context.Services.AddRange(services);
            context.SaveChanges();
        }
    }

    private static void EnsureSchema(AppDbContext context)
    {
        // Проект использует EnsureCreated(), поэтому миграции не применяются.
        // Для безопасного развития схемы на SQLite добавляем новые колонки idempotent-скриптом.
        try
        {
            var hasPromoImage = context.Database
                .SqlQueryRaw<int>("SELECT COUNT(1) AS Value FROM pragma_table_info('Articles') WHERE name = 'PromoImage';")
                .AsEnumerable()
                .FirstOrDefault() > 0;

            if (!hasPromoImage)
            {
                context.Database.ExecuteSqlRaw("ALTER TABLE Articles ADD COLUMN PromoImage TEXT NULL;");
            }
        }
        catch
        {
            // Не валим приложение на проверке схемы: в худшем случае поле останется недоступным.
        }
    }
}
