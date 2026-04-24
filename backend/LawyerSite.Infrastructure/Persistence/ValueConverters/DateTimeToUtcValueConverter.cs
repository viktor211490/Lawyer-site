using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

using LawyerSite.Infrastructure.Time;

namespace LawyerSite.Infrastructure.Persistence.ValueConverters;

/// <summary>
/// Конвертер для хранения DateTime в UTC в SQLite
/// При сохранении конвертирует в UTC, при чтении устанавливает Kind = Utc
/// </summary>
public class DateTimeToUtcValueConverter : ValueConverter<DateTime, DateTime>
{
    public DateTimeToUtcValueConverter() : base(
        // При записи в БД: ожидаем, что приложение передаёт московское локальное время
        v => DateTimeConverterHelpers.ToProvider(v),
        // При чтении из БД: возвращаем московское локальное время
        v => DateTimeConverterHelpers.FromProvider(v)
    )
    {
    }
}

/// <summary>
/// Конвертер для хранения nullable DateTime в UTC в SQLite
/// </summary>
public class NullableDateTimeToUtcValueConverter : ValueConverter<DateTime?, DateTime?>
{
    public NullableDateTimeToUtcValueConverter() : base(
        v => DateTimeConverterHelpers.ToProviderNullable(v),
        v => DateTimeConverterHelpers.FromProviderNullable(v)
    )
    {
    }
}

internal static class DateTimeConverterHelpers
{
    public static DateTime ToProvider(DateTime v)
    {
        var dt = v;
        if (dt.Kind == DateTimeKind.Unspecified)
        {
            // Интерпретируем как московское локальное и конвертируем в UTC
            var moscow = MoscowTimeProvider.ConvertToMoscow(dt);
            // Попытка найти московскую TZ, если не найдена - используем UTC (ConvertTimeToUtc will treat as UTC)
            try
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById("Russian Standard Time");
                return TimeZoneInfo.ConvertTimeToUtc(moscow, tz);
            }
            catch
            {
                return moscow.ToUniversalTime();
            }
        }

        return dt.Kind == DateTimeKind.Utc ? dt : dt.ToUniversalTime();
    }

    public static DateTime FromProvider(DateTime v)
    {
        // При чтении из БД v считается UTC
        return MoscowTimeProvider.ConvertToMoscow(DateTime.SpecifyKind(v, DateTimeKind.Utc));
    }

    public static DateTime? ToProviderNullable(DateTime? v) => v.HasValue ? ToProvider(v.Value) : null;
    public static DateTime? FromProviderNullable(DateTime? v) => v.HasValue ? FromProvider(v.Value) : null;
}
