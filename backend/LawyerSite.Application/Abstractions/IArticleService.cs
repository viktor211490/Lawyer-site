using LawyerSite.Domain.Entities;

namespace LawyerSite.Application.Abstractions;

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

    Task<(string coverImagePath, string promoImagePath)> CropBlogImagesAsync(
        string sourceImagePath,
        CropRect coverCrop,
        CropRect promoCrop
    );
}

public readonly record struct CropRect(double X, double Y, double Width, double Height);
