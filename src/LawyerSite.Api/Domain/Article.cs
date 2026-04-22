using System.ComponentModel.DataAnnotations;

namespace LawyerSite.Api.Domain;

/// <summary>
/// Статья в блоге
/// </summary>
public class Article
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    public string Content { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(500)]
    public string Excerpt { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? CoverImage { get; set; }
    
    [Required]
    public string AuthorId { get; set; } = string.Empty;
    
    [MaxLength(200)]
    public string AuthorName { get; set; } = "Алексеева Мария Викторовна";
    
    public DateTime PublishedDate { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public bool IsPublished { get; set; } = false;
    
    public bool IsVisibleInBlog { get; set; } = true;
    
    public ArticleStatus Status { get; set; } = ArticleStatus.Draft;
    
    public DateTime? ScheduledAt { get; set; }
    
    // Для сортировки
    public int SortOrder { get; set; } = 0;
    
    // Теги для категоризации
    [MaxLength(500)]
    public string? Tags { get; set; }
}
