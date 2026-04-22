using System.ComponentModel.DataAnnotations;

namespace PsychoSite.Api.Domain;

/// <summary>
/// Запись на приём к психологу
/// </summary>
public class Appointment
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(200)]
    public string ClientName { get; set; } = string.Empty;
    
    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string ClientEmail { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(50)]
    public string ClientPhone { get; set; } = string.Empty;
    
    [Required]
    public DateTime AppointmentTime { get; set; }
    
    public int DurationMinutes { get; set; } = 60;
    
    [MaxLength(1000)]
    public string? Notes { get; set; }
    
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Scheduled;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ConfirmedAt { get; set; }
    
    public DateTime? CancelledAt { get; set; }
    
    // Навигационное свойство для заблокированных слотов
    public bool IsBlocked { get; set; } = false;

    [MaxLength(200)]
    public string? BlockReason { get; set; }

    // Связь с услугой
    public int? ServiceId { get; set; }
    public Service? Service { get; set; }
}
