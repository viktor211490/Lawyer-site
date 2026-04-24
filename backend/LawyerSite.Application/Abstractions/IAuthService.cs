using LawyerSite.Domain.Entities;

namespace LawyerSite.Application.Abstractions;

public interface IAuthService
{
    Task<(AdminUser user, string token)?> AuthenticateAsync(string username, string password);
    Task<AdminUser?> GetUserByIdAsync(string id);
    Task<AdminUser?> GetUserByEmailAsync(string email);
    Task<AdminUser> CreateAdminAsync(string username, string email, string password, string fullName);
}
