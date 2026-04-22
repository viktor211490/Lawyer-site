using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PsychoSite.Api.Domain;

/// <summary>
/// Услуга психолога
/// </summary>
public class Service
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Price { get; set; }

    public bool IsActive { get; set; } = true;

    public int DurationMinutes { get; set; } = 60;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Навигационное свойство
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}
