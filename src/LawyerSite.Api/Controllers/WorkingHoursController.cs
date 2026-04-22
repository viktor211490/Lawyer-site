using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PsychoSite.Api.Data;
using PsychoSite.Api.Domain;
using PsychoSite.Api.DTOs;
using PsychoSite.Api.Services;

namespace PsychoSite.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WorkingHoursController : ControllerBase
{
    private readonly IWorkingHoursService _service;
    private readonly ILogger<WorkingHoursController> _logger;
    private readonly AppDbContext _context;
    
    public WorkingHoursController(
        IWorkingHoursService service, 
        ILogger<WorkingHoursController> logger,
        AppDbContext context)
    {
        _service = service;
        _logger = logger;
        _context = context;
    }
    
    /// <summary>
    /// Получить все рабочие часы недели
    /// </summary>
    [HttpGet("week")]
    [AllowAnonymous]
    public async Task<ActionResult<List<WorkingHourDto>>> GetWeek()
    {
        var hours = await _service.GetAllWorkingHoursAsync();

        var response = hours.Select(h => new WorkingHourDto(
            h.Id,
            (int)h.DayOfWeek,
            h.DayOfWeek.ToString(),
            h.StartHour,
            h.StartMinute,
            h.EndHour,
            h.EndMinute,
            h.IsWorkingDay,
            h.SlotDurationMinutes,
            h.BreakBetweenSlotsMinutes
        )).ToList();

        return Ok(response);
    }
    
    /// <summary>
    /// Получить расписание на день
    /// </summary>
    [HttpGet("day/{date:datetime}")]
    public async Task<ActionResult<DayScheduleResponseDto>> GetDaySchedule(DateTime date)
    {
        var schedule = await _service.GetDayScheduleAsync(date);
        
        var response = new DayScheduleResponseDto(
            schedule.Date,
            schedule.IsWorkingDay,
            schedule.StartTime?.ToString(@"hh\:mm"),
            schedule.EndTime?.ToString(@"hh\:mm"),
            schedule.SlotDurationMinutes,
            schedule.Comment,
            schedule.IsCustomSchedule
        );
        
        return Ok(response);
    }
    
    /// <summary>
    /// Получить доступные слоты на день
    /// </summary>
    [HttpGet("day/{date:datetime}/slots")]
    public async Task<ActionResult<List<TimeSlotDto>>> GetDaySlots(DateTime date)
    {
        var slots = await _service.GetAvailableSlotsForDayAsync(date);
        
        var response = slots.Select(s => new TimeSlotDto(
            s.Time,
            s.IsAvailable,
            s.Status
        )).ToList();
        
        return Ok(response);
    }
    
    /// <summary>
    /// Сохранить рабочие часы для дня недели
    /// </summary>
    [HttpPut("day/{dayOfWeek:int}")]
    public async Task<ActionResult<WorkingHourDto>> SaveWorkingHour(
        int dayOfWeek,
        [FromBody] SaveWorkingHourDto dto)
    {
        try
        {
            var workingHour = new WorkingHour
            {
                DayOfWeek = (DayOfWeekEnum)dayOfWeek,
                StartHour = dto.StartHour,
                StartMinute = dto.StartMinute,
                EndHour = dto.EndHour,
                EndMinute = dto.EndMinute,
                IsWorkingDay = dto.IsWorkingDay,
                SlotDurationMinutes = dto.SlotDurationMinutes,
                BreakBetweenSlotsMinutes = dto.BreakBetweenSlotsMinutes
            };

            var saved = await _service.SaveWorkingHourAsync(workingHour);

            var response = new WorkingHourDto(
                saved.Id,
                (int)saved.DayOfWeek,
                saved.DayOfWeek.ToString(),
                saved.StartHour,
                saved.StartMinute,
                saved.EndHour,
                saved.EndMinute,
                saved.IsWorkingDay,
                saved.SlotDurationMinutes,
                saved.BreakBetweenSlotsMinutes
            );

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving working hour");
            return BadRequest(new { message = "Ошибка сохранения" });
        }
    }
    
    /// <summary>
    /// Сохранить переопределение для конкретного дня
    /// </summary>
    [HttpPut("date/{date:datetime}")]
    public async Task<ActionResult<WorkingDayDto>> SaveWorkingDay(
        DateTime date, 
        [FromBody] SaveWorkingDayDto dto)
    {
        try
        {
            var workingDay = new WorkingDay
            {
                Date = date,
                StartHour = dto.StartHour,
                StartMinute = dto.StartMinute,
                EndHour = dto.EndHour,
                EndMinute = dto.EndMinute,
                IsWorkingDay = dto.IsWorkingDay,
                Comment = dto.Comment
            };
            
            var saved = await _service.SaveWorkingDayAsync(workingDay);
            
            var response = new WorkingDayDto(
                saved.Id,
                saved.Date,
                saved.StartHour,
                saved.StartMinute,
                saved.EndHour,
                saved.EndMinute,
                saved.IsWorkingDay,
                saved.Comment
            );
            
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving working day");
            return BadRequest(new { message = "Ошибка сохранения" });
        }
    }
    
    /// <summary>
    /// Удалить переопределение для дня
    /// </summary>
    [HttpDelete("date/{date:datetime}")]
    public async Task<IActionResult> DeleteWorkingDay(DateTime date)
    {
        var workingDay = await _service.GetWorkingDayAsync(date);
        if (workingDay == null)
        {
            return NotFound();
        }

        _context.WorkingDays.Remove(workingDay);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Сбросить все рабочие часы (для отладки)
    /// </summary>
    [HttpDelete("reset")]
    [Authorize]
    public async Task<IActionResult> ResetWorkingHours()
    {
        _context.WorkingHours.RemoveRange(_context.WorkingHours);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
