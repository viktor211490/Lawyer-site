using System.Text.Json;
using System.Text.Json.Serialization;
using LawyerSite.Infrastructure.Time;

namespace LawyerSite.Api;

/// <summary>
/// Конвертер для корректной обработки DateTime из JSON
/// Фронтенд отправляет время в UTC (через Date.UTC), мы сохраняем его как есть
/// </summary>
public class JsonStringDateTimeConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var dateString = reader.GetString();
        if (string.IsNullOrEmpty(dateString))
        {
            return DateTime.MinValue;
        }

        // Парсим ISO 8601 строку.
        // Если приходит с Z/offset, DateTimeStyles.RoundtripKind сохранит корректный Kind (Utc/Local).
        // Далее приводим к московскому локальному времени (Kind = Unspecified), потому что доменная модель хранит время как московское.
        if (DateTime.TryParse(dateString, null, System.Globalization.DateTimeStyles.RoundtripKind, out var result))
        {
            // Конвертируем в московское локальное время и возвращаем с Kind = Unspecified
            var moscow = MoscowTimeProvider.ConvertToMoscow(result);
            return DateTime.SpecifyKind(moscow, DateTimeKind.Unspecified);
        }

        throw new JsonException($"Unable to parse date: {dateString}");
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        // Важно: всегда указываем смещение (+03:00), чтобы браузер не интерпретировал время
        // как локальное время компьютера пользователя (это вызывает "скачки" при других TZ).
        var moscow = MoscowTimeProvider.ConvertToMoscow(value);
        var dto = new DateTimeOffset(moscow, TimeSpan.FromHours(3));
        writer.WriteStringValue(dto.ToString("yyyy-MM-dd'T'HH:mm:sszzz"));
    }
}
