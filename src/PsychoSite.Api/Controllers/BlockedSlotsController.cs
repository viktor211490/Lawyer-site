using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PsychoSite.Api.Domain;
using PsychoSite.Api.DTOs;
using PsychoSite.Api.Services;

namespace PsychoSite.Api.Controllers;

[ApiController]
[Route("api/blocked-slots")]
[Authorize]
public class BlockedSlotsController : ControllerBase
{
    private readonly IBlockSlotService _blockService;
    private readonly IAppointmentService _appointmentService;
    private readonly ILogger<BlockedSlotsController> _logger;
    
    public BlockedSlotsController(
        IBlockSlotService blockService,
        IAppointmentService appointmentService,
        ILogger<BlockedSlotsController> logger)
    {
        _blockService = blockService;
        _appointmentService = appointmentService;
        _logger = logger;
    }
    
    /// <summary>
    /// Получить все блокировки
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<BlockedSlotResponseDto>>> GetAll()
    {
        var slots = await _blockService.GetAllAsync();

        var response = slots.Select(s => new BlockedSlotResponseDto(
            s.Id,
            s.DateTime,
            s.DurationHours,
            s.DurationMinutes,
            s.Reason.ToString(),
            s.Comment,
            s.IsFullDay,
            s.CreatedAt,
            s.EndDateTime
        )).ToList();

        return Ok(response);
    }
    
    /// <summary>
    /// Получить блокировки по диапазону дат
    /// </summary>
    [HttpGet("range")]
    [AllowAnonymous]
    public async Task<ActionResult<List<BlockedSlotResponseDto>>> GetByRange(
        [FromQuery] string start,
        [FromQuery] string end)
    {
        _logger.LogInformation($"GetByRange: start={start}, end={end}");

        if (!DateTime.TryParse(start, out var startDate))
        {
            _logger.LogWarning($"Invalid start date: {start}, using default");
            startDate = DateTime.Now.AddDays(-30);
        }

        if (!DateTime.TryParse(end, out var endDate))
        {
            _logger.LogWarning($"Invalid end date: {end}, using default");
            endDate = DateTime.Now.AddDays(30);
        }

        _logger.LogInformation($"Parsed dates: {startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}");

        try
        {
            var slots = await _blockService.GetByDateRangeAsync(startDate, endDate);
            _logger.LogInformation($"Found {slots.Count} blocked slots");

            var response = slots.Select(s => new BlockedSlotResponseDto(
                s.Id,
                s.DateTime,
                s.DurationHours,
                s.DurationMinutes,
                s.Reason.ToString(),
                s.Comment,
                s.IsFullDay,
                s.CreatedAt,
                s.EndDateTime
            )).ToList();

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetByRange");
            throw;
        }
    }
    
    /// <summary>
    /// Получить блокировки и записи на день
    /// </summary>
    [HttpGet("day/{date}")]
    public async Task<ActionResult<DayStatisticsDto>> GetDayDetails(string date)
    {
        // Парсим дату в формате yyyy-MM-dd как локальную дату без конвертации в UTC
        if (!DateTime.TryParseExact(date, "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.AssumeLocal, out var dateOnly))
        {
            if (!DateTime.TryParse(date, out dateOnly))
            {
                return BadRequest(new { message = "Неверный формат даты. Используйте yyyy-MM-dd" });
            }
        }
        
        var stats = await _appointmentService.GetDayStatisticsAsync(dateOnly.Date);
        var blockedSlots = await _blockService.GetByDayAsync(dateOnly.Date);

        var response = new DTOs.DayStatisticsDto(
            stats.Date,
            stats.TotalAppointments,
            stats.ConfirmedAppointments,
            stats.CancelledAppointments,
            stats.ScheduledAppointments,
            stats.Appointments.Select(a => new AppointmentResponseDto(
                a.Id,
                a.ClientName,
                a.ClientEmail,
                a.ClientPhone,
                a.AppointmentTime,
                a.DurationMinutes,
                a.Notes,
                a.Status.ToString(),
                a.CreatedAt,
                a.ConfirmedAt,
                a.CancelledAt,
                a.IsBlocked,
                a.BlockReason,
                a.ServiceId,
                a.Service?.Title
            )).ToList(),
            blockedSlots.Select(b => new BlockedSlotResponseDto(
                b.Id,
                b.DateTime,
                b.DurationHours,
                b.DurationMinutes,
                b.Reason.ToString(),
                b.Comment,
                b.IsFullDay,
                b.CreatedAt,
                b.EndDateTime
            )).ToList()
        );

        return Ok(response);
    }
    
    /// <summary>
    /// Заблокировать слот
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<BlockedSlotResponseDto>> Create([FromBody] CreateBlockedSlotDto dto)
    {
        _logger.LogInformation($"Create blocked slot: DateTime={dto.DateTime}, DurationHours={dto.DurationHours}, DurationMinutes={dto.DurationMinutes}, Reason={dto.Reason}, IsFullDay={dto.IsFullDay}");

        try
        {
            var reason = BlockReason.Personal;
            if (!string.IsNullOrEmpty(dto.Reason) && Enum.TryParse<BlockReason>(dto.Reason, true, out var parsedReason))
            {
                reason = parsedReason;
            }

            _logger.LogInformation($"Parsed reason: {reason}");

            var slot = new BlockedSlot
            {
                DateTime = dto.DateTime,
                DurationHours = dto.DurationHours,
                DurationMinutes = dto.DurationMinutes,
                Reason = reason,
                Comment = dto.Comment,
                IsFullDay = dto.IsFullDay
            };

            _logger.LogInformation($"Creating slot in database...");

            var created = await _blockService.CreateAsync(slot);

            _logger.LogInformation($"Created slot with ID: {created.Id}");

            var response = new BlockedSlotResponseDto(
                created.Id,
                created.DateTime,
                created.DurationHours,
                created.DurationMinutes,
                created.Reason.ToString(),
                created.Comment,
                created.IsFullDay,
                created.CreatedAt,
                created.EndDateTime
            );

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка при блокировке слота. StackTrace: {StackTrace}", ex.StackTrace);
            return BadRequest(new { message = "Ошибка при блокировке слота", error = ex.Message });
        }
    }
    
    /// <summary>
    /// Удалить блокировку
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _blockService.DeleteAsync(id);
        
        if (!result)
        {
            return NotFound();
        }
        
        return NoContent();
    }
    
    /// <summary>
    /// Проверить, заблокирован ли слот
    /// </summary>
    [HttpGet("check")]
    public async Task<ActionResult<bool>> CheckSlot([FromQuery] DateTime time)
    {
        var isBlocked = await _blockService.IsSlotBlocked(time);
        return Ok(isBlocked);
    }
}
