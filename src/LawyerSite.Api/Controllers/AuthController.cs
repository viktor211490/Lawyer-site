using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LawyerSite.Api.DTOs;
using LawyerSite.Api.Services;

namespace LawyerSite.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _service;
    private readonly ILogger<AuthController> _logger;
    
    public AuthController(IAuthService service, ILogger<AuthController> logger)
    {
        _service = service;
        _logger = logger;
    }
    
    /// <summary>
    /// Войти в админ-панель
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto dto)
    {
        var result = await _service.AuthenticateAsync(dto.Username, dto.Password);
        
        if (result == null)
        {
            return Unauthorized(new { message = "Неверное имя пользователя или пароль" });
        }
        
        var (user, token) = result.Value;
        
        var response = new AuthResponseDto(
            token,
            user.Username,
            user.Email,
            user.FullName
        );
        
        return Ok(response);
    }
    
    /// <summary>
    /// Получить текущий профиль
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<AuthResponseDto>> GetProfile()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        
        if (userId == null)
        {
            return Unauthorized();
        }
        
        var user = await _service.GetUserByIdAsync(userId);
        
        if (user == null)
        {
            return NotFound();
        }
        
        // Генерируем новый токен
        var token = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier) != null 
            ? string.Empty // Токен не возвращаем здесь
            : string.Empty;
        
        var response = new AuthResponseDto(
            token,
            user.Username,
            user.Email,
            user.FullName
        );
        
        return Ok(response);
    }
    
    /// <summary>
    /// Выйти из системы
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        // В случае с JWT logout на клиенте (удаление токена)
        return Ok(new { message = "Выход выполнен" });
    }
}
