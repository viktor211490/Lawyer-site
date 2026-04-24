using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LawyerSite.Application.Abstractions;
using LawyerSite.Application.Contracts;
using LawyerSite.Domain.Entities;
using LawyerSite.Domain.Enums;
using LawyerSite.Infrastructure.Time;

namespace LawyerSite.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AppointmentsController : ControllerBase
{
    private readonly IAppointmentService _service;
    private readonly ILogger<AppointmentsController> _logger;
    
    public AppointmentsController(IAppointmentService service, ILogger<AppointmentsController> logger)
    {
        _service = service;
        _logger = logger;
    }
    
    /// <summary>
    /// Получить доступные слоты для записи (публичный доступ)
    /// </summary>
    [HttpGet("slots")]
    public async Task<ActionResult<List<TimeSlotDto>>> GetAvailableSlots(
        [FromQuery] DateTime? startDate,
        [FromQuery] int days = 7,
        [FromQuery] int? serviceId = null,
        CancellationToken cancellation = default)
    {
        // Нормализуем старт к московской дате, иначе при приходе startDate в UTC (с Z)
        // слоты "уедут" на +3 часа при генерации.
        var start = startDate.HasValue
            ? MoscowTimeProvider.ConvertToMoscow(startDate.Value).Date
            : MoscowTimeProvider.GetMoscowNow().Date;
        var appointments = await _service.GetAvailableSlotsAsync(start, cancellation, days, serviceId);

        var slots = appointments.Select(a => new TimeSlotDto(
            a.AppointmentTime,
            !a.IsBlocked && a.Status != AppointmentStatus.Confirmed,
            a.IsBlocked ? "blocked" :
            a.Status == AppointmentStatus.Confirmed ? "unavailable" : "available",
            a.DurationMinutes
        )).ToList();

        return Ok(slots);
    }
    
    /// <summary>
    /// Получить все записи (только админ)
    /// </summary>
    [HttpGet]
    [Authorize]
    public async Task<ActionResult<List<AppointmentResponseDto>>> GetAll()
    {
        var appointments = await _service.GetAllAsync();

        var response = appointments.Select(a => new AppointmentResponseDto(
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
        )).ToList();

        return Ok(response);
    }
    
    /// <summary>
    /// Получить календарь записей на месяц (только админ)
    /// </summary>
    [HttpGet("calendar")]
    [Authorize]
    public async Task<ActionResult<CalendarMonthDto>> GetCalendar(
        [FromQuery] int year,
        [FromQuery] int month)
    {
        if (year == 0 || month == 0)
        {
            var now = DateTime.Now;
            year = now.Year;
            month = now.Month;
        }

        var monthDate = new DateTime(year, month, 1);
        var appointments = await _service.GetCalendarViewAsync(monthDate);

        // Группируем записи по дням и считаем количество
        var days = appointments
            .GroupBy(a => a.AppointmentTime.Date)
            .Select(g => new CalendarDayDto(
                g.Key,
                g.Select(a => new AppointmentResponseDto(
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
                )).ToList()
            ))
            .ToList();

        // Добавляем дни без записей для полноты календаря
        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);
        var allDays = new List<DateTime>();
        var current = startDate.Date;
        while (current <= endDate.Date)
        {
            allDays.Add(current);
            current = current.AddDays(1);
        }

        foreach (var day in allDays)
        {
            if (!days.Any(d => d.Date.Date == day.Date))
            {
                days.Add(new CalendarDayDto(day, new List<AppointmentResponseDto>()));
            }
        }

        return Ok(new CalendarMonthDto(year, month, days));
    }

    /// <summary>
    /// Получить все записи на конкретный день (только админ)
    /// </summary>
    [HttpGet("day/{date:datetime}")]
    [Authorize]
    public async Task<ActionResult<DayAppointmentsDto>> GetDayAppointments(DateTime date)
    {
        // Используем дату без времени для корректного сравнения
        var dateOnly = date.Date;
        
        var stats = await _service.GetDayStatisticsAsync(dateOnly);

        var response = new DayAppointmentsDto(
            dateOnly.ToString("yyyy-MM-dd"),
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
            )).ToList()
        );

        return Ok(response);
    }
    
    /// <summary>
    /// Получить запись по ID (только админ)
    /// </summary>
    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<ActionResult<AppointmentResponseDto>> GetById(int id)
    {
        var appointment = await _service.GetByIdAsync(id);
        
        if (appointment == null)
        {
            return NotFound();
        }
        
        var response = new AppointmentResponseDto(
            appointment.Id,
            appointment.ClientName,
            appointment.ClientEmail,
            appointment.ClientPhone,
            appointment.AppointmentTime,
            appointment.DurationMinutes,
            appointment.Notes,
            appointment.Status.ToString(),
            appointment.CreatedAt,
            appointment.ConfirmedAt,
            appointment.CancelledAt,
            appointment.IsBlocked,
            appointment.BlockReason,
            appointment.ServiceId,
            appointment.Service?.Title
        );

        return Ok(response);
    }
    
    /// <summary>
    /// Создать запись (публичный доступ)
    /// </summary>
    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<AppointmentResponseDto>> Create([FromBody] CreateAppointmentDto dto)
    {
        try
        {
            var appointment = new Appointment
            {
                ClientName = dto.ClientName,
                ClientEmail = dto.ClientEmail,
                ClientPhone = dto.ClientPhone,
                // Время в DTO уже приводится JSON-конвертером к московскому локальному (Kind = Unspecified).
                // Хранение в БД в UTC обеспечивается EF ValueConverter.
                AppointmentTime = dto.AppointmentTime,
                Notes = dto.Notes,
                ServiceId = dto.ServiceId
            };

            var created = await _service.CreateAsync(appointment);

            var response = new AppointmentResponseDto(
                created.Id,
                created.ClientName,
                created.ClientEmail,
                created.ClientPhone,
                created.AppointmentTime,
                created.DurationMinutes,
                created.Notes,
                created.Status.ToString(),
                created.CreatedAt,
                created.ConfirmedAt,
                created.CancelledAt,
                created.IsBlocked,
                created.BlockReason,
                created.ServiceId,
                created.Service?.Title
            );

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    
    /// <summary>
    /// Обновить запись (только админ)
    /// </summary>
    [HttpPut("{id:int}")]
    [Authorize]
    public async Task<ActionResult<AppointmentResponseDto>> Update(int id, [FromBody] UpdateAppointmentDto dto)
    {
        try
        {
            var appointment = new Appointment
            {
                ClientName = dto.ClientName,
                ClientEmail = dto.ClientEmail,
                ClientPhone = dto.ClientPhone,
                AppointmentTime = dto.AppointmentTime,
                Notes = dto.Notes,
                IsBlocked = dto.IsBlocked,
                BlockReason = dto.BlockReason,
                ServiceId = dto.ServiceId
            };

            var updated = await _service.UpdateAsync(id, appointment);

            if (updated == null)
            {
                return NotFound();
            }

            var response = new AppointmentResponseDto(
                updated.Id,
                updated.ClientName,
                updated.ClientEmail,
                updated.ClientPhone,
                updated.AppointmentTime,
                updated.DurationMinutes,
                updated.Notes,
                updated.Status.ToString(),
                updated.CreatedAt,
                updated.ConfirmedAt,
                updated.CancelledAt,
                updated.IsBlocked,
                updated.BlockReason,
                updated.ServiceId,
                updated.Service?.Title
            );

            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    
    /// <summary>
    /// Обновить статус записи (только админ)
    /// </summary>
    [HttpPatch("{id:int}/status")]
    [Authorize]
    public async Task<ActionResult<AppointmentResponseDto>> UpdateStatus(int id, [FromQuery] string status)
    {
        if (!Enum.TryParse<AppointmentStatus>(status, true, out var appointmentStatus))
        {
            return BadRequest(new { message = "Неверный статус" });
        }
        
        var updated = await _service.UpdateStatusAsync(id, appointmentStatus);
        
        if (updated == null)
        {
            return NotFound();
        }
        
        var response = new AppointmentResponseDto(
            updated.Id,
            updated.ClientName,
            updated.ClientEmail,
            updated.ClientPhone,
            updated.AppointmentTime,
            updated.DurationMinutes,
            updated.Notes,
            updated.Status.ToString(),
            updated.CreatedAt,
            updated.ConfirmedAt,
            updated.CancelledAt,
            updated.IsBlocked,
            updated.BlockReason,
            updated.ServiceId,
            updated.Service?.Title
        );

        return Ok(response);
    }
    
    /// <summary>
    /// Удалить запись (только админ)
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
}

// DTO для записей на день
public record DayAppointmentsDto(
    string Date,
    int TotalAppointments,
    int ConfirmedAppointments,
    int CancelledAppointments,
    int ScheduledAppointments,
    List<AppointmentResponseDto> Appointments
);
