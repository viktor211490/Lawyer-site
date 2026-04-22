using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PsychoSite.Api.Domain;
using PsychoSite.Api.DTOs;
using PsychoSite.Api.Services;

namespace PsychoSite.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ArticlesController : ControllerBase
{
    private readonly IArticleService _service;
    private readonly ILogger<ArticlesController> _logger;
    
    public ArticlesController(IArticleService service, ILogger<ArticlesController> logger)
    {
        _service = service;
        _logger = logger;
    }
    
    /// <summary>
    /// Получить все статьи для блога (публичный доступ)
    /// </summary>
    [HttpGet("blog")]
    public async Task<ActionResult<List<ArticleBriefDto>>> GetBlogArticles()
    {
        var articles = await _service.GetBlogVisibleAsync();
        
        var response = articles.Select(a => new ArticleBriefDto(
            a.Id,
            a.Title,
            a.Excerpt,
            a.CoverImage,
            a.AuthorName,
            a.PublishedDate,
            a.Status.ToString()
        )).ToList();
        
        return Ok(response);
    }
    
    /// <summary>
    /// Получить статью по ID (публичный доступ)
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ArticleResponseDto>> GetById(int id)
    {
        var article = await _service.GetByIdAsync(id);
        
        if (article == null)
        {
            return NotFound();
        }
        
        // Если статья не опубликована и не скрыта, доступ только для админа
        if (!article.IsPublished && article.Status != ArticleStatus.Hidden)
        {
            if (!User.Identity?.IsAuthenticated ?? true)
            {
                return NotFound();
            }
        }
        
        var response = new ArticleResponseDto(
            article.Id,
            article.Title,
            article.Content,
            article.Excerpt,
            article.CoverImage,
            article.AuthorName,
            article.PublishedDate,
            article.CreatedAt,
            article.UpdatedAt,
            article.IsPublished,
            article.IsVisibleInBlog,
            article.Status.ToString(),
            article.ScheduledAt,
            article.SortOrder,
            article.Tags
        );
        
        return Ok(response);
    }
    
    /// <summary>
    /// Получить все статьи (только админ)
    /// </summary>
    [HttpGet]
    [Authorize]
    public async Task<ActionResult<List<ArticleBriefDto>>> GetAll()
    {
        var articles = await _service.GetAllAsync();
        
        var response = articles.Select(a => new ArticleBriefDto(
            a.Id,
            a.Title,
            a.Excerpt,
            a.CoverImage,
            a.AuthorName,
            a.PublishedDate,
            a.Status.ToString()
        )).ToList();
        
        return Ok(response);
    }
    
    /// <summary>
    /// Создать статью (только админ)
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ArticleResponseDto>> Create([FromBody] CreateArticleDto dto)
    {
        var article = new Article
        {
            Title = dto.Title,
            Content = dto.Content,
            Excerpt = dto.Excerpt,
            CoverImage = dto.CoverImage,
            IsPublished = dto.IsPublished,
            IsVisibleInBlog = dto.IsVisibleInBlog,
            Tags = dto.Tags,
            AuthorId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "admin"
        };
        
        var created = await _service.CreateAsync(article);
        
        var response = new ArticleResponseDto(
            created.Id,
            created.Title,
            created.Content,
            created.Excerpt,
            created.CoverImage,
            created.AuthorName,
            created.PublishedDate,
            created.CreatedAt,
            created.UpdatedAt,
            created.IsPublished,
            created.IsVisibleInBlog,
            created.Status.ToString(),
            created.ScheduledAt,
            created.SortOrder,
            created.Tags
        );
        
        return Ok(response);
    }
    
    /// <summary>
    /// Обновить статью (только админ)
    /// </summary>
    [HttpPut("{id:int}")]
    [Authorize]
    public async Task<ActionResult<ArticleResponseDto>> Update(int id, [FromBody] UpdateArticleDto dto)
    {
        var article = new Article
        {
            Title = dto.Title,
            Content = dto.Content,
            Excerpt = dto.Excerpt,
            CoverImage = dto.CoverImage,
            IsPublished = dto.IsPublished,
            IsVisibleInBlog = dto.IsVisibleInBlog,
            Tags = dto.Tags,
            SortOrder = dto.SortOrder
        };
        
        var updated = await _service.UpdateAsync(id, article);
        
        if (updated == null)
        {
            return NotFound();
        }
        
        var response = new ArticleResponseDto(
            updated.Id,
            updated.Title,
            updated.Content,
            updated.Excerpt,
            updated.CoverImage,
            updated.AuthorName,
            updated.PublishedDate,
            updated.CreatedAt,
            updated.UpdatedAt,
            updated.IsPublished,
            updated.IsVisibleInBlog,
            updated.Status.ToString(),
            updated.ScheduledAt,
            updated.SortOrder,
            updated.Tags
        );
        
        return Ok(response);
    }
    
    /// <summary>
    /// Опубликовать статью (только админ)
    /// </summary>
    [HttpPost("{id:int}/publish")]
    [Authorize]
    public async Task<ActionResult<ArticleResponseDto>> Publish(int id)
    {
        var updated = await _service.PublishAsync(id);
        
        if (updated == null)
        {
            return NotFound();
        }
        
        var response = new ArticleResponseDto(
            updated.Id,
            updated.Title,
            updated.Content,
            updated.Excerpt,
            updated.CoverImage,
            updated.AuthorName,
            updated.PublishedDate,
            updated.CreatedAt,
            updated.UpdatedAt,
            updated.IsPublished,
            updated.IsVisibleInBlog,
            updated.Status.ToString(),
            updated.ScheduledAt,
            updated.SortOrder,
            updated.Tags
        );
        
        return Ok(response);
    }
    
    /// <summary>
    /// Запланировать статью (только админ)
    /// </summary>
    [HttpPost("{id:int}/schedule")]
    [Authorize]
    public async Task<ActionResult<ArticleResponseDto>> Schedule(int id, [FromQuery] DateTime scheduledAt)
    {
        var updated = await _service.ScheduleAsync(id, scheduledAt);
        
        if (updated == null)
        {
            return NotFound();
        }
        
        var response = new ArticleResponseDto(
            updated.Id,
            updated.Title,
            updated.Content,
            updated.Excerpt,
            updated.CoverImage,
            updated.AuthorName,
            updated.PublishedDate,
            updated.CreatedAt,
            updated.UpdatedAt,
            updated.IsPublished,
            updated.IsVisibleInBlog,
            updated.Status.ToString(),
            updated.ScheduledAt,
            updated.SortOrder,
            updated.Tags
        );
        
        return Ok(response);
    }
    
    /// <summary>
    /// Переключить видимость в блоге (только админ)
    /// </summary>
    [HttpPost("{id:int}/toggle-visibility")]
    [Authorize]
    public async Task<ActionResult<ArticleResponseDto>> ToggleVisibility(int id)
    {
        var updated = await _service.ToggleVisibilityAsync(id);
        
        if (updated == null)
        {
            return NotFound();
        }
        
        var response = new ArticleResponseDto(
            updated.Id,
            updated.Title,
            updated.Content,
            updated.Excerpt,
            updated.CoverImage,
            updated.AuthorName,
            updated.PublishedDate,
            updated.CreatedAt,
            updated.UpdatedAt,
            updated.IsPublished,
            updated.IsVisibleInBlog,
            updated.Status.ToString(),
            updated.ScheduledAt,
            updated.SortOrder,
            updated.Tags
        );
        
        return Ok(response);
    }
    
    /// <summary>
    /// Удалить статью (только админ)
    /// </summary>
    [HttpDelete("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _service.DeleteAsync(id);
        
        if (!result)
        {
            return NotFound();
        }
        
        return NoContent();
    }
    
    /// <summary>
    /// Загрузить изображение для статьи (только админ)
    /// </summary>
    [HttpPost("upload-image")]
    [Authorize]
    public async Task<ActionResult<string>> UploadImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Файл не выбран" });
        }
        
        try
        {
            using var stream = file.OpenReadStream();
            var imagePath = await _service.UploadImageAsync(stream, file.FileName, file.ContentType);
            
            return Ok(new { path = imagePath });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка при загрузке изображения");
            return StatusCode(500, new { message = "Ошибка при загрузке изображения" });
        }
    }
}
