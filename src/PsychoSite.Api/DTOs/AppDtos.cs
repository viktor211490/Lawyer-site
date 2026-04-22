namespace PsychoSite.Api.DTOs;

// Записи
public record CreateAppointmentDto(
    string ClientName,
    string ClientEmail,
    string ClientPhone,
    DateTime AppointmentTime,
    string? Notes,
    int? ServiceId
)
{
    // Получить время в UTC для сохранения в БД
    public DateTime GetUtcAppointmentTime() => 
        AppointmentTime.Kind == DateTimeKind.Utc 
            ? AppointmentTime 
            : AppointmentTime.ToUniversalTime();
}

public record UpdateAppointmentDto(
    string ClientName,
    string ClientEmail,
    string ClientPhone,
    DateTime AppointmentTime,
    string? Notes,
    bool IsBlocked,
    string? BlockReason,
    int? ServiceId
)
{
    // Получить время в UTC для сохранения в БД
    public DateTime GetUtcAppointmentTime() => 
        AppointmentTime.Kind == DateTimeKind.Utc 
            ? AppointmentTime 
            : AppointmentTime.ToUniversalTime();
}

public record AppointmentResponseDto(
    int Id,
    string ClientName,
    string ClientEmail,
    string ClientPhone,
    DateTime AppointmentTime,
    int DurationMinutes,
    string? Notes,
    string Status,
    DateTime CreatedAt,
    DateTime? ConfirmedAt,
    DateTime? CancelledAt,
    bool IsBlocked,
    string? BlockReason,
    int? ServiceId,
    string? ServiceTitle
);

public record TimeSlotDto(
    DateTime Time,
    bool IsAvailable,
    string Status,
    int DurationMinutes = 60
);

public record CalendarDayDto(
    DateTime Date,
    List<AppointmentResponseDto> Appointments
);

public record CalendarMonthDto(
    int Year,
    int Month,
    List<CalendarDayDto> Days
);

// Статьи
public record CreateArticleDto(
    string Title,
    string Content,
    string Excerpt,
    string? CoverImage,
    bool IsPublished,
    bool IsVisibleInBlog,
    string? Tags
);

public record UpdateArticleDto(
    string Title,
    string Content,
    string Excerpt,
    string? CoverImage,
    bool IsPublished,
    bool IsVisibleInBlog,
    string? Tags,
    int SortOrder
);

public record ArticleResponseDto(
    int Id,
    string Title,
    string Content,
    string Excerpt,
    string? CoverImage,
    string AuthorName,
    DateTime PublishedDate,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    bool IsPublished,
    bool IsVisibleInBlog,
    string Status,
    DateTime? ScheduledAt,
    int SortOrder,
    string? Tags
);

public record ArticleBriefDto(
    int Id,
    string Title,
    string Excerpt,
    string? CoverImage,
    string AuthorName,
    DateTime PublishedDate,
    string Status
);

// Аутентификация
public record LoginDto(string Username, string Password);
public record AuthResponseDto(string Token, string Username, string Email, string FullName);
public record ChangePasswordDto(string CurrentPassword, string NewPassword);

// Блокировки слотов
public record CreateBlockedSlotDto(
    DateTime DateTime,
    int DurationHours = 0,
    int DurationMinutes = 0,
    string? Reason = null,
    string? Comment = null,
    bool IsFullDay = false
);

public record BlockedSlotResponseDto(
    int Id,
    DateTime DateTime,
    int DurationHours,
    int DurationMinutes,
    string Reason,
    string? Comment,
    bool IsFullDay,
    DateTime CreatedAt,
    DateTime EndDateTime
);

public record DayStatisticsDto(
    DateTime Date,
    int TotalAppointments,
    int ConfirmedAppointments,
    int CancelledAppointments,
    int ScheduledAppointments,
    List<AppointmentResponseDto> Appointments,
    List<BlockedSlotResponseDto> BlockedSlots
);

// Рабочие часы
public record WorkingHourDto(
    int Id,
    int DayOfWeekNum,
    string DayOfWeekName,
    int StartHour,
    int StartMinute,
    int EndHour,
    int EndMinute,
    bool IsWorkingDay,
    int SlotDurationMinutes,
    int BreakBetweenSlotsMinutes = 0
);

public record WorkingDayDto(
    int Id,
    DateTime Date,
    int? StartHour,
    int? StartMinute,
    int? EndHour,
    int? EndMinute,
    bool? IsWorkingDay,
    string? Comment
);

public record SaveWorkingHourDto(
    int StartHour,
    int StartMinute,
    int EndHour,
    int EndMinute,
    bool IsWorkingDay,
    int SlotDurationMinutes = 60,
    int BreakBetweenSlotsMinutes = 0
);

public record SaveWorkingDayDto(
    int? StartHour,
    int? StartMinute,
    int? EndHour,
    int? EndMinute,
    bool? IsWorkingDay,
    string? Comment
);

public record DayScheduleResponseDto(
    DateTime Date,
    bool IsWorkingDay,
    string? StartTime,
    string? EndTime,
    int SlotDurationMinutes,
    string? Comment,
    bool IsCustomSchedule
);

// Услуги
public record ServiceDto(
    int Id,
    string Title,
    string? Description,
    decimal Price,
    bool IsActive,
    int DurationMinutes,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateServiceDto(
    string Title,
    string? Description,
    decimal Price,
    bool IsActive,
    int DurationMinutes
);

public record UpdateServiceDto(
    string Title,
    string? Description,
    decimal Price,
    bool IsActive,
    int DurationMinutes
);
