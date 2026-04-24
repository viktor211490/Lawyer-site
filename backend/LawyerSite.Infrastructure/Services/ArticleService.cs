using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using LawyerSite.Application.Abstractions;
using LawyerSite.Domain.Entities;
using LawyerSite.Domain.Enums;
using LawyerSite.Infrastructure.Persistence;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Processing;

namespace LawyerSite.Infrastructure.Services;

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
        existing.SourceImage = article.SourceImage;
        existing.CoverImage = article.CoverImage;
        existing.PromoImage = article.PromoImage;
        existing.IsPublished = article.IsPublished;
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
        // WebRootPath может быть не задан (например, если папка wwwroot отсутствует в окружении запуска).
        // В этом случае используем ContentRootPath/wwwroot и гарантируем, что директория существует.
        var webRootPath = _environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(webRootPath))
        {
            webRootPath = Path.Combine(_environment.ContentRootPath, "wwwroot");
        }

        Directory.CreateDirectory(webRootPath);

        // Создаём папку для загрузок если не существует
        var uploadsFolder = Path.Combine(webRootPath, "uploads", "articles");
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

    public async Task<(string coverImagePath, string promoImagePath)> CropBlogImagesAsync(
        string sourceImagePath,
        CropRect coverCrop,
        CropRect promoCrop
    )
    {
        if (string.IsNullOrWhiteSpace(sourceImagePath))
        {
            throw new InvalidOperationException("Не указан исходный путь изображения.");
        }

        if (!sourceImagePath.StartsWith("/uploads/articles/", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Неверный путь исходного изображения.");
        }

        var webRootPath = _environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(webRootPath))
        {
            webRootPath = Path.Combine(_environment.ContentRootPath, "wwwroot");
        }

        var sourceFullPath = Path.Combine(webRootPath, sourceImagePath.TrimStart('/'));
        if (!File.Exists(sourceFullPath))
        {
            throw new InvalidOperationException("Исходное изображение не найдено.");
        }

        var outDir = Path.Combine(webRootPath, "uploads", "articles", "derived");
        Directory.CreateDirectory(outDir);

        await using var fs = File.OpenRead(sourceFullPath);
        using var image = await Image.LoadAsync(fs);

        var coverPath = coverCrop.Width > 1 && coverCrop.Height > 1
            ? await SaveDerivedAsync(image, coverCrop, 1200, 630, outDir, "cover")
            : string.Empty;

        var promoPath = promoCrop.Width > 1 && promoCrop.Height > 1
            ? await SaveDerivedAsync(image, promoCrop, 600, 600, outDir, "promo")
            : string.Empty;

        return (coverPath, promoPath);
    }

    private static async Task<string> SaveDerivedAsync(
        Image source,
        CropRect crop,
        int targetW,
        int targetH,
        string outDir,
        string kind
    )
    {
        if (crop.Width <= 1 || crop.Height <= 1)
        {
            throw new InvalidOperationException("Некорректная область кадрирования.");
        }

        var x = (int)Math.Round(crop.X);
        var y = (int)Math.Round(crop.Y);
        var w = (int)Math.Round(crop.Width);
        var h = (int)Math.Round(crop.Height);

        x = Math.Clamp(x, 0, source.Width - 1);
        y = Math.Clamp(y, 0, source.Height - 1);
        w = Math.Clamp(w, 1, source.Width - x);
        h = Math.Clamp(h, 1, source.Height - y);

        var fileName = $"{Guid.NewGuid():N}-{kind}-{targetW}x{targetH}.jpg";
        var fullOut = Path.Combine(outDir, fileName);

        using var derived = source.Clone(ctx =>
        {
            ctx.Crop(new Rectangle(x, y, w, h));
            ctx.Resize(new ResizeOptions
            {
                Size = new Size(targetW, targetH),
                Mode = ResizeMode.Crop
            });
        });

        var encoder = new JpegEncoder { Quality = 85 };
        await derived.SaveAsJpegAsync(fullOut, encoder);

        return $"/uploads/articles/derived/{fileName}";
    }
}
