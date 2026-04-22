using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LawyerSite.Api.DTOs;
using LawyerSite.Api.Services;

namespace LawyerSite.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServicesController : ControllerBase
{
    private readonly IServiceService _service;
    private readonly ILogger<ServicesController> _logger;

    public ServicesController(IServiceService service, ILogger<ServicesController> logger)
    {
        _service = service;
        _logger = logger;
    }

    /// <summary>
    /// Получить все услуги (публичный доступ — только активные)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<ServiceDto>>> GetServices([FromQuery] bool activeOnly = false)
    {
        var services = await _service.GetAllAsync(activeOnly);

        var dtos = services.Select(s => new ServiceDto(
            s.Id, s.Title, s.Description, s.Price, s.IsActive,
            s.DurationMinutes, s.CreatedAt, s.UpdatedAt
        )).ToList();

        return Ok(dtos);
    }

    /// <summary>
    /// Получить услугу по ID (публичный доступ)
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ServiceDto>> GetById(int id)
    {
        var service = await _service.GetByIdAsync(id);
        if (service == null) return NotFound();

        return Ok(new ServiceDto(
            service.Id, service.Title, service.Description, service.Price,
            service.IsActive, service.DurationMinutes, service.CreatedAt, service.UpdatedAt
        ));
    }

    /// <summary>
    /// Создать услугу (только админ)
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ServiceDto>> Create([FromBody] CreateServiceDto dto)
    {
        var service = new Domain.Service
        {
            Title = dto.Title,
            Description = dto.Description,
            Price = dto.Price,
            IsActive = dto.IsActive,
            DurationMinutes = dto.DurationMinutes
        };

        var created = await _service.CreateAsync(service);

        return Ok(new ServiceDto(
            created.Id, created.Title, created.Description, created.Price,
            created.IsActive, created.DurationMinutes, created.CreatedAt, created.UpdatedAt
        ));
    }

    /// <summary>
    /// Обновить услугу (только админ)
    /// </summary>
    [HttpPut("{id:int}")]
    [Authorize]
    public async Task<ActionResult<ServiceDto>> Update(int id, [FromBody] UpdateServiceDto dto)
    {
        var service = new Domain.Service
        {
            Title = dto.Title,
            Description = dto.Description,
            Price = dto.Price,
            IsActive = dto.IsActive,
            DurationMinutes = dto.DurationMinutes
        };

        var updated = await _service.UpdateAsync(id, service);
        if (updated == null) return NotFound();

        return Ok(new ServiceDto(
            updated.Id, updated.Title, updated.Description, updated.Price,
            updated.IsActive, updated.DurationMinutes, updated.CreatedAt, updated.UpdatedAt
        ));
    }

    /// <summary>
    /// Удалить услугу (только админ)
    /// </summary>
    [HttpDelete("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var result = await _service.DeleteAsync(id);
            if (!result) return NotFound();
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
