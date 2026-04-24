using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LawyerSite.Application.Abstractions;
using LawyerSite.Application.Contracts;
using LawyerSite.Domain.Entities;
using LawyerSite.Domain.Enums;

namespace LawyerSite.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ArticlesController : ControllerBase
{
    private readonly IArticleService _service;
    private readonly ILogger<ArticlesController> _logger;

    public class UploadImageForm
    {
        [FromForm(Name = "file")]
        public IFormFile File { get; set; } = default!;
    }
    
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
            a.PromoImage,
            a.AuthorName,
            a.PublishedDate,
            a.Status.ToString(),
            a.IsVisibleInBlog
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
            article.SourceImage,
            article.CoverImage,
            article.PromoImage,
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
            a.PromoImage,
            a.AuthorName,
            a.PublishedDate,
            a.Status.ToString(),
            a.IsVisibleInBlog
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
            SourceImage = dto.SourceImage,
            CoverImage = dto.CoverImage,
            PromoImage = dto.PromoImage,
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
            created.SourceImage,
            created.CoverImage,
            created.PromoImage,
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
            SourceImage = dto.SourceImage,
            CoverImage = dto.CoverImage,
            PromoImage = dto.PromoImage,
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
            updated.SourceImage,
            updated.CoverImage,
            updated.PromoImage,
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
            updated.SourceImage,
            updated.CoverImage,
            updated.PromoImage,
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
            updated.SourceImage,
            updated.CoverImage,
            updated.PromoImage,
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
            updated.SourceImage,
            updated.CoverImage,
            updated.PromoImage,
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
    [Consumes("multipart/form-data")]
    [Authorize]
    public async Task<ActionResult<string>> UploadImage([FromForm] UploadImageForm form)
    {
        var file = form.File;
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Файл не выбран" });
        }
        
        try
        {
            using var stream = file.OpenReadStream();
            var imagePath = await _service.UploadImageAsync(stream, file.FileName, file.ContentType);
            
            return Ok(imagePath);
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

    public record CropRectDto(double X, double Y, double Width, double Height);
    public record CropBlogImagesRequest(string SourceImagePath, CropRectDto? CoverCrop, CropRectDto? PromoCrop);
    public record CropBlogImagesResponse(string? CoverImagePath, string? PromoImagePath);

    /// <summary>
    /// Сформировать обложку и промо для блога из уже загруженного изображения (только админ)
    /// </summary>
    [HttpPost("crop-blog-images")]
    [Authorize]
    public async Task<ActionResult<CropBlogImagesResponse>> CropBlogImages([FromBody] CropBlogImagesRequest req)
    {
        try
        {
            string? cover = null;
            string? promo = null;

            if (req.CoverCrop != null)
            {
                (cover, _) = await _service.CropBlogImagesAsync(
                    req.SourceImagePath,
                    new LawyerSite.Application.Abstractions.CropRect(req.CoverCrop.X, req.CoverCrop.Y, req.CoverCrop.Width, req.CoverCrop.Height),
                    new LawyerSite.Application.Abstractions.CropRect(0, 0, 1, 1)
                );
            }

            if (req.PromoCrop != null)
            {
                (_, promo) = await _service.CropBlogImagesAsync(
                    req.SourceImagePath,
                    new LawyerSite.Application.Abstractions.CropRect(0, 0, 1, 1),
                    new LawyerSite.Application.Abstractions.CropRect(req.PromoCrop.X, req.PromoCrop.Y, req.PromoCrop.Width, req.PromoCrop.Height)
                );
            }

            return Ok(new CropBlogImagesResponse(cover, promo));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка при кадрировании изображения статьи");
            return StatusCode(500, new { message = "Не удалось обработать изображение" });
        }
    }
}
