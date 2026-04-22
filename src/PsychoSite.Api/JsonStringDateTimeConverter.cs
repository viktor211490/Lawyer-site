using System.Text.Json;
using System.Text.Json.Serialization;

namespace PsychoSite.Api;

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

        // Парсим ISO 8601 строку. Если приходит с Z/offset, приводим к UTC, затем конвертируем в московское локальное время
        if (DateTime.TryParse(dateString, null, System.Globalization.DateTimeStyles.RoundtripKind, out var result))
        {
            // Конвертируем в московское локальное время и возвращаем с Kind = Unspecified
            var moscow = PsychoSite.Api.Time.MoscowTimeProvider.ConvertToMoscow(result);
            return DateTime.SpecifyKind(moscow, DateTimeKind.Unspecified);
        }

        throw new JsonException($"Unable to parse date: {dateString}");
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        // Сериализуем в ISO 8601 формат в московском времени (без Z)
        var moscow = PsychoSite.Api.Time.MoscowTimeProvider.ConvertToMoscow(value);
        // Записываем без указания зоны, frontend будет интерпретировать как локальное Moscow time
        writer.WriteStringValue(moscow.ToString("yyyy-MM-ddTHH:mm:ss"));
    }
}
