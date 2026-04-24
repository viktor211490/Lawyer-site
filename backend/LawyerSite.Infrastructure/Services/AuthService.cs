using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using LawyerSite.Application.Abstractions;
using LawyerSite.Domain.Entities;
using LawyerSite.Infrastructure.Persistence;

namespace LawyerSite.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    
    public AuthService(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }
    
    public async Task<(AdminUser user, string token)?> AuthenticateAsync(string username, string password)
    {
        var user = await _context.AdminUsers
            .FirstOrDefaultAsync(u => (u.Username == username || u.Email == username) && u.IsActive);
        
        if (user == null)
        {
            return null;
        }
        
        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
        {
            return null;
        }
        
        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        
        var token = GenerateJwtToken(user);
        
        return (user, token);
    }
    
    public async Task<AdminUser?> GetUserByIdAsync(string id)
    {
        return await _context.AdminUsers.FindAsync(id);
    }
    
    public async Task<AdminUser?> GetUserByEmailAsync(string email)
    {
        return await _context.AdminUsers.FirstOrDefaultAsync(u => u.Email == email);
    }
    
    public async Task<AdminUser> CreateAdminAsync(string username, string email, string password, string fullName)
    {
        // Проверяем существует ли уже
        var existing = await _context.AdminUsers
            .FirstOrDefaultAsync(u => u.Username == username || u.Email == email);
        
        if (existing != null)
        {
            throw new InvalidOperationException("Пользователь с таким именем или email уже существует");
        }
        
        var admin = new AdminUser
        {
            Username = username,
            Email = email,
            FullName = fullName,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        
        _context.AdminUsers.Add(admin);
        await _context.SaveChangesAsync();
        
        return admin;
    }
    
    private string GenerateJwtToken(AdminUser user)
    {
        var jwtSettings = _configuration.GetSection("Jwt");
        var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not configured");
        var expirationMinutes = jwtSettings.GetValue<int>("ExpirationMinutes", 1440);
        
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim("FullName", user.FullName)
        };
        
        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
            signingCredentials: credentials
        );
        
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
