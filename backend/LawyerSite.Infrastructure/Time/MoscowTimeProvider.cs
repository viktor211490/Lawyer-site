using System;

namespace LawyerSite.Infrastructure.Time;

public static class MoscowTimeProvider
{
    private static readonly string[] TimeZoneIds = new[] { "Russian Standard Time", "Europe/Moscow" };

    private static TimeZoneInfo? _moscowZone;

    private static TimeZoneInfo MoscowZone
    {
        get
        {
            if (_moscowZone != null) return _moscowZone;
            foreach (var id in TimeZoneIds)
            {
                try
                {
                    _moscowZone = TimeZoneInfo.FindSystemTimeZoneById(id);
                    break;
                }
                catch
                {
                    // try next id
                }
            }

            _moscowZone ??= TimeZoneInfo.Utc;
            return _moscowZone;
        }
    }

    // Returns current Moscow time with Kind = Unspecified (represents Moscow-local time)
    public static DateTime GetMoscowNow()
    {
        var utcNow = DateTime.UtcNow;
        var moscow = TimeZoneInfo.ConvertTimeFromUtc(utcNow, MoscowZone);
        return DateTime.SpecifyKind(moscow, DateTimeKind.Unspecified);
    }

    // Converts any DateTime (Utc/Local/Unspecified) to Moscow-local (Kind = Unspecified)
    public static DateTime ConvertToMoscow(DateTime dt)
    {
        if (dt.Kind == DateTimeKind.Utc)
        {
            var moscow = TimeZoneInfo.ConvertTimeFromUtc(dt, MoscowZone);
            return DateTime.SpecifyKind(moscow, DateTimeKind.Unspecified);
        }

        if (dt.Kind == DateTimeKind.Local)
        {
            var utc = dt.ToUniversalTime();
            var moscow = TimeZoneInfo.ConvertTimeFromUtc(utc, MoscowZone);
            return DateTime.SpecifyKind(moscow, DateTimeKind.Unspecified);
        }

        // Unspecified - assume it's already Moscow-local
        return DateTime.SpecifyKind(dt, DateTimeKind.Unspecified);
    }
}
