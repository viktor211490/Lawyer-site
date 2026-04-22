using System.ComponentModel.DataAnnotations;

namespace LawyerSite.Api.Domain;

public enum DayOfWeekEnum
{
    Monday = 1,
    Tuesday = 2,
    Wednesday = 3,
    Thursday = 4,
    Friday = 5,
    Saturday = 6,
    Sunday = 7
}

/// <summary>
/// Рабочие часы для дня недели (эталонная неделя)
/// </summary>
public class WorkingHour
{
    [Key]
    public int Id { get; set; }

    public DayOfWeekEnum DayOfWeek { get; set; }

    public int StartHour { get; set; } = 9;  // 09:00
    public int StartMinute { get; set; } = 0;

    public int EndHour { get; set; } = 18;  // 18:00
    public int EndMinute { get; set; } = 0;

    public bool IsWorkingDay { get; set; } = true;

    public int SlotDurationMinutes { get; set; } = 60;

    /// <summary>
    /// Перерыв между записями в минутах (0, 15, 20, 30)
    /// </summary>
    public int BreakBetweenSlotsMinutes { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Индивидуальные настройки для конкретного дня (переопределение эталонной недели)
/// </summary>
public class WorkingDay
{
    [Key]
    public int Id { get; set; }
    
    public DateTime Date { get; set; }
    
    public int? StartHour { get; set; }  // null = используется эталонный день
    public int? StartMinute { get; set; }
    
    public int? EndHour { get; set; }
    public int? EndMinute { get; set; }
    
    public bool? IsWorkingDay { get; set; }  // null = используется эталонный день
    
    public string? Comment { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
