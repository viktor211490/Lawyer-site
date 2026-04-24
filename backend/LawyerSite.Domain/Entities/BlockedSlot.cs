using System.ComponentModel.DataAnnotations;

namespace LawyerSite.Domain.Entities;

public enum BlockReason
{
    Lunch = 0,      // Обед
    Personal = 1,   // Личные дела
    Vacation = 2,   // Отпуск
    Sick = 3,       // Больничный
    Other = 4       // Другое
}

/// <summary>
/// Заблокированный слот времени
/// </summary>
public class BlockedSlot
{
    [Key]
    public int Id { get; set; }

    [Required]
    public DateTime DateTime { get; set; }

    public int DurationHours { get; set; } = 1;

    /// <summary>
    /// Длительность блокировки в минутах (для коротких перерывов: 15, 30, 60 мин)
    /// </summary>
    public int DurationMinutes { get; set; } = 0;

    /// <summary>
    /// Вычисляемое время окончания блокировки
    /// </summary>
    public DateTime EndDateTime => DateTime.AddHours(DurationHours).AddMinutes(DurationMinutes);

    public BlockReason Reason { get; set; } = BlockReason.Personal;

    [MaxLength(500)]
    public string? Comment { get; set; }

    public bool IsFullDay { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
