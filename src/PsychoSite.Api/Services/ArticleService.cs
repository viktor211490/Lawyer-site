using Microsoft.EntityFrameworkCore;
using PsychoSite.Api.Data;
using PsychoSite.Api.Domain;

namespace PsychoSite.Api.Services;

public interface IArticleService
{
    Task<List<Article>> GetAllAsync();
    Task<List<Article>> GetPublishedAsync();
    Task<List<Article>> GetBlogVisibleAsync();
    Task<Article?> GetByIdAsync(int id);
    Task<Article?> GetBySlugAsync(string slug);
    Task<Article> CreateAsync(Article article);
    Task<Article?> UpdateAsync(int id, Article article);
    Task<bool> DeleteAsync(int id);
    Task<Article?> PublishAsync(int id);
    Task<Article?> ScheduleAsync(int id, DateTime scheduledAt);
    Task<Article?> ToggleVisibilityAsync(int id);
    Task<string> UploadImageAsync(Stream fileStream, string fileName, string contentType);
    Task<bool> DeleteImageAsync(string imagePath);
}

public class ArticleService : IArticleService
{
    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly IConfiguration _configuration;
    
    public ArticleService(AppDbContext context, IWebHostEnvironment environment, IConfiguration configuration)
    {
        _context = context;
        _environment = environment;
        _configuration = configuration;
    }
    
    public async Task<List<Article>> GetAllAsync()
    {
        return await _context.Articles
            .OrderByDescending(a => a.PublishedDate)
            .ToListAsync();
    }
    
    public async Task<List<Article>> GetPublishedAsync()
    {
        return await _context.Articles
            .Where(a => a.IsPublished && a.Status == ArticleStatus.Published)
            .OrderByDescending(a => a.PublishedDate)
            .ToListAsync();
    }
    
    public async Task<List<Article>> GetBlogVisibleAsync()
    {
        return await _context.Articles
            .Where(a => a.IsPublished && a.IsVisibleInBlog && a.Status == ArticleStatus.Published)
            .OrderByDescending(a => a.PublishedDate)
            .ToListAsync();
    }
    
    public async Task<Article?> GetByIdAsync(int id)
    {
        return await _context.Articles.FindAsync(id);
    }
    
    public async Task<Article?> GetBySlugAsync(string slug)
    {
        // Простая реализация через ID в slug
        if (int.TryParse(slug, out var id))
        {
            return await GetByIdAsync(id);
        }
        return null;
    }
    
    public async Task<Article> CreateAsync(Article article)
    {
        article.CreatedAt = DateTime.UtcNow;
        article.UpdatedAt = DateTime.UtcNow;
        
        // Устанавливаем статус
        if (article.ScheduledAt.HasValue && article.ScheduledAt > DateTime.UtcNow)
        {
            article.Status = ArticleStatus.Scheduled;
            article.IsPublished = false;
        }
        else if (article.IsPublished)
        {
            article.Status = ArticleStatus.Published;
            article.PublishedDate = DateTime.UtcNow;
        }
        else
        {
            article.Status = ArticleStatus.Draft;
        }
        
        _context.Articles.Add(article);
        await _context.SaveChangesAsync();
        
        return article;
    }
    
    public async Task<Article?> UpdateAsync(int id, Article article)
    {
        var existing = await _context.Articles.FindAsync(id);
        if (existing == null)
        {
            return null;
        }
        
        existing.Title = article.Title;
        existing.Content = article.Content;
        existing.Excerpt = article.Excerpt;
        existing.CoverImage = article.CoverImage;
        existing.IsVisibleInBlog = article.IsVisibleInBlog;
        existing.Tags = article.Tags;
        existing.SortOrder = article.SortOrder;
        existing.UpdatedAt = DateTime.UtcNow;
        
        // Обновляем статус если нужно
        if (article.Status != existing.Status)
        {
            existing.Status = article.Status;
            
            if (article.Status == ArticleStatus.Published)
            {
                existing.IsPublished = true;
                existing.PublishedDate = existing.PublishedDate == default ? DateTime.UtcNow : existing.PublishedDate;
            }
            else if (article.Status == ArticleStatus.Draft)
            {
                existing.IsPublished = false;
            }
        }
        
        await _context.SaveChangesAsync();
        
        return existing;
    }
    
    public async Task<bool> DeleteAsync(int id)
    {
        var article = await _context.Articles.FindAsync(id);
        if (article == null)
        {
            return false;
        }
        
        // Удаляем обложку если есть
        if (!string.IsNullOrEmpty(article.CoverImage))
        {
            await DeleteImageAsync(article.CoverImage);
        }
        
        _context.Articles.Remove(article);
        await _context.SaveChangesAsync();
        
        return true;
    }
    
    public async Task<Article?> PublishAsync(int id)
    {
        var article = await _context.Articles.FindAsync(id);
        if (article == null)
        {
            return null;
        }
        
        article.IsPublished = true;
        article.IsVisibleInBlog = true;
        article.Status = ArticleStatus.Published;
        article.PublishedDate = DateTime.UtcNow;
        article.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        return article;
    }
    
    public async Task<Article?> ScheduleAsync(int id, DateTime scheduledAt)
    {
        var article = await _context.Articles.FindAsync(id);
        if (article == null)
        {
            return null;
        }
        
        article.ScheduledAt = scheduledAt;
        article.Status = ArticleStatus.Scheduled;
        article.IsPublished = false;
        article.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        return article;
    }
    
    public async Task<Article?> ToggleVisibilityAsync(int id)
    {
        var article = await _context.Articles.FindAsync(id);
        if (article == null)
        {
            return null;
        }
        
        article.IsVisibleInBlog = !article.IsVisibleInBlog;
        article.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        return article;
    }
    
    public async Task<string> UploadImageAsync(Stream fileStream, string fileName, string contentType)
    {
        // Создаём папку для загрузок если не существует
        var uploadsFolder = Path.Combine(_environment.WebRootPath, "uploads", "articles");
        Directory.CreateDirectory(uploadsFolder);
        
        // Генерируем уникальное имя файла
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var allowedExtensions = _configuration.GetSection("UploadSettings:AllowedExtensions").Get<string[]>() 
                               ?? new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        
        if (!allowedExtensions.Contains(extension))
        {
            throw new InvalidOperationException($"Недопустимый формат файла. Разрешены: {string.Join(", ", allowedExtensions)}");
        }
        
        var maxFileSize = _configuration.GetValue<long>("UploadSettings:MaxFileSizeBytes", 5242880);
        if (fileStream.Length > maxFileSize)
        {
            throw new InvalidOperationException($"Файл слишком большой. Максимальный размер: {maxFileSize / 1024 / 1024}MB");
        }
        
        var uniqueFileName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);
        
        using (var fileStreamOutput = new FileStream(filePath, FileMode.Create))
        {
            await fileStream.CopyToAsync(fileStreamOutput);
        }
        
        // Возвращаем относительный путь
        return $"/uploads/articles/{uniqueFileName}";
    }
    
    public async Task<bool> DeleteImageAsync(string imagePath)
    {
        try
        {
            var fullPath = Path.Combine(_environment.WebRootPath, imagePath.TrimStart('/'));
            if (File.Exists(fullPath))
            {
                File.Delete(fullPath);
                return true;
            }
        }
        catch
        {
            // Игнорируем ошибки удаления
        }
        
        return false;
    }
}
