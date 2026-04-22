using Microsoft.EntityFrameworkCore;
using PsychoSite.Api.Data;
using PsychoSite.Api.Domain;
using PsychoSite.Api.DTOs;

namespace PsychoSite.Api.Services;

public interface IWorkingHoursService
{
    Task<List<WorkingHour>> GetAllWorkingHoursAsync();
    Task<WorkingHour?> GetWorkingHourByDayAsync(DayOfWeekEnum dayOfWeek);
    Task<WorkingHour> SaveWorkingHourAsync(WorkingHour workingHour);
    Task<WorkingDay?> GetWorkingDayAsync(DateTime date);
    Task<WorkingDay> SaveWorkingDayAsync(WorkingDay workingDay);
    Task<List<WorkingDay>> GetWorkingDaysByRangeAsync(DateTime start, DateTime end);
    Task<DayScheduleDto> GetDayScheduleAsync(DateTime date);
    Task<List<TimeSlotDto>> GetAvailableSlotsForDayAsync(DateTime date);
    Task<bool> IsWorkingDayAsync(DateTime date);
    Task<bool> IsWorkingHoursAsync(DateTime date);
}

public class DayScheduleDto
{
    public DateTime Date { get; set; }
    public bool IsWorkingDay { get; set; }
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public int SlotDurationMinutes { get; set; } = 60;
    public int BreakBetweenSlotsMinutes { get; set; } = 0;
    public string? Comment { get; set; }
    public bool IsCustomSchedule { get; set; }  // true если есть переопределение
}

public class WorkingHoursService : IWorkingHoursService
{
    private readonly AppDbContext _context;
    
    public WorkingHoursService(AppDbContext context)
    {
        _context = context;
    }
    
    public async Task<List<WorkingHour>> GetAllWorkingHoursAsync()
    {
        return await _context.WorkingHours.ToListAsync();
    }
    
    public async Task<WorkingHour?> GetWorkingHourByDayAsync(DayOfWeekEnum dayOfWeek)
    {
        return await _context.WorkingHours.FirstOrDefaultAsync(wh => wh.DayOfWeek == dayOfWeek);
    }
    
    public async Task<WorkingHour> SaveWorkingHourAsync(WorkingHour workingHour)
    {
        var existing = await _context.WorkingHours.FirstOrDefaultAsync(wh => wh.DayOfWeek == workingHour.DayOfWeek);

        if (existing == null)
        {
            // Если записи нет - создаем новую
            workingHour.CreatedAt = DateTime.UtcNow;
            workingHour.UpdatedAt = DateTime.UtcNow;
            _context.WorkingHours.Add(workingHour);
        }
        else
        {
            // Если запись есть - обновляем только если изменились значения
            if (existing.StartHour != workingHour.StartHour ||
                existing.StartMinute != workingHour.StartMinute ||
                existing.EndHour != workingHour.EndHour ||
                existing.EndMinute != workingHour.EndMinute ||
                existing.IsWorkingDay != workingHour.IsWorkingDay ||
                existing.SlotDurationMinutes != workingHour.SlotDurationMinutes ||
                existing.BreakBetweenSlotsMinutes != workingHour.BreakBetweenSlotsMinutes)
            {
                existing.StartHour = workingHour.StartHour;
                existing.StartMinute = workingHour.StartMinute;
                existing.EndHour = workingHour.EndHour;
                existing.EndMinute = workingHour.EndMinute;
                existing.IsWorkingDay = workingHour.IsWorkingDay;
                existing.SlotDurationMinutes = workingHour.SlotDurationMinutes;
                existing.BreakBetweenSlotsMinutes = workingHour.BreakBetweenSlotsMinutes;
                existing.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();
        return workingHour;
    }
    
    public async Task<WorkingDay?> GetWorkingDayAsync(DateTime date)
    {
        return await _context.WorkingDays.FirstOrDefaultAsync(wd => wd.Date.Date == date.Date);
    }
    
    public async Task<WorkingDay> SaveWorkingDayAsync(WorkingDay workingDay)
    {
        var existing = await _context.WorkingDays.FirstOrDefaultAsync(wd => wd.Date.Date == workingDay.Date.Date);
        
        if (existing == null)
        {
            _context.WorkingDays.Add(workingDay);
        }
        else
        {
            existing.StartHour = workingDay.StartHour;
            existing.StartMinute = workingDay.StartMinute;
            existing.EndHour = workingDay.EndHour;
            existing.EndMinute = workingDay.EndMinute;
            existing.IsWorkingDay = workingDay.IsWorkingDay;
            existing.Comment = workingDay.Comment;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        
        await _context.SaveChangesAsync();
        return workingDay;
    }
    
    public async Task<List<WorkingDay>> GetWorkingDaysByRangeAsync(DateTime start, DateTime end)
    {
        return await _context.WorkingDays
            .Where(wd => wd.Date >= start.Date && wd.Date <= end.Date)
            .ToListAsync();
    }
    
    public async Task<DayScheduleDto> GetDayScheduleAsync(DateTime date)
    {
        var dayOfWeek = (DayOfWeekEnum)((int)date.DayOfWeek == 0 ? 7 : (int)date.DayOfWeek);
        var workingHour = await GetWorkingHourByDayAsync(dayOfWeek);
        var workingDay = await GetWorkingDayAsync(date);

        var result = new DayScheduleDto
        {
            Date = date,
            IsWorkingDay = workingHour?.IsWorkingDay ?? true,
            SlotDurationMinutes = workingHour?.SlotDurationMinutes ?? 60,
            BreakBetweenSlotsMinutes = workingHour?.BreakBetweenSlotsMinutes ?? 0,
            IsCustomSchedule = workingDay != null,
            Comment = workingDay?.Comment
        };

        if (workingDay != null)
        {
            // Есть переопределение
            if (workingDay.IsWorkingDay.HasValue)
            {
                result.IsWorkingDay = workingDay.IsWorkingDay.Value;
            }

            if (workingDay.StartHour.HasValue)
            {
                result.StartTime = TimeSpan.FromHours(workingDay.StartHour.Value) +
                                   TimeSpan.FromMinutes(workingDay.StartMinute ?? 0);
            }
            else if (workingHour != null)
            {
                result.StartTime = TimeSpan.FromHours(workingHour.StartHour) +
                                   TimeSpan.FromMinutes(workingHour.StartMinute);
            }

            if (workingDay.EndHour.HasValue)
            {
                result.EndTime = TimeSpan.FromHours(workingDay.EndHour.Value) +
                                 TimeSpan.FromMinutes(workingDay.EndMinute ?? 0);
            }
            else if (workingHour != null)
            {
                result.EndTime = TimeSpan.FromHours(workingHour.EndHour) +
                                 TimeSpan.FromMinutes(workingHour.EndMinute);
            }
        }
        else if (workingHour != null)
        {
            result.StartTime = TimeSpan.FromHours(workingHour.StartHour) +
                               TimeSpan.FromMinutes(workingHour.StartMinute);
            result.EndTime = TimeSpan.FromHours(workingHour.EndHour) +
                             TimeSpan.FromMinutes(workingHour.EndMinute);
        }

        return result;
    }
    
    public async Task<List<TimeSlotDto>> GetAvailableSlotsForDayAsync(DateTime date)
    {
        var schedule = await GetDayScheduleAsync(date);
        var slots = new List<TimeSlotDto>();

        if (!schedule.IsWorkingDay || schedule.StartTime == null || schedule.EndTime == null)
        {
            return slots;
        }

        var appointments = await _context.Appointments
            .Where(a => a.AppointmentTime.Date == date.Date && a.Status != AppointmentStatus.Cancelled)
            .ToListAsync();

        var blockedSlots = await _context.BlockedSlots
            .Where(b => b.DateTime.Date == date.Date)
            .ToListAsync();

        // Получаем перерыв из расписания
        var breakMinutes = schedule.BreakBetweenSlotsMinutes;

        // Шаг генерации слотов = slotDurationMinutes (например, 15 мин)
        var slotStep = schedule.SlotDurationMinutes;

            var currentMinutes = schedule.StartTime.Value.TotalMinutes;
        var endMinutes = schedule.EndTime.Value.TotalMinutes;

        while (currentMinutes + schedule.SlotDurationMinutes <= endMinutes)
        {
            var slotDateTime = date.Date.AddMinutes(currentMinutes);
            var slotEnd = slotDateTime.AddMinutes(schedule.SlotDurationMinutes);

            // Блокируем слоты которые уже прошли (в московском времени)
            var slotLocalMoscow = PsychoSite.Api.Time.MoscowTimeProvider.ConvertToMoscow(slotDateTime);
            var moscowNow = PsychoSite.Api.Time.MoscowTimeProvider.GetMoscowNow();
            var isPast = slotLocalMoscow < moscowNow;

            // Проверка на пересечение с записью (с учётом перерыва после записи)
            var isTaken = isPast || appointments.Any(a =>
            {
                var appointmentEndWithBreak = a.AppointmentTime.AddMinutes(a.DurationMinutes).AddMinutes(breakMinutes);
                // Слот занят если пересекается с записью + перерывом
                return (a.AppointmentTime < slotEnd && appointmentEndWithBreak > slotDateTime);
            });

            // Проверка на пересечение с блокировкой
            var isBlocked = blockedSlots.Any(b =>
            {
                var blockEnd = b.DateTime.AddHours(b.DurationHours).AddMinutes(b.DurationMinutes);
                return (b.DateTime < slotEnd && blockEnd > slotDateTime);
            });

            slots.Add(new TimeSlotDto(
                slotDateTime.ToLocalTime(), // Конвертируем в локальное время
                !isTaken && !isBlocked,
                isBlocked ? "blocked" : isTaken ? "unavailable" : "available",
                schedule.SlotDurationMinutes
            ));

            // Следующий слот с шагом slotDurationMinutes
            currentMinutes += slotStep;
        }

        return slots;
    }
    
    public async Task<bool> IsWorkingDayAsync(DateTime date)
    {
        var schedule = await GetDayScheduleAsync(date);
        return schedule.IsWorkingDay;
    }
    
    public async Task<bool> IsWorkingHoursAsync(DateTime date)
    {
        var schedule = await GetDayScheduleAsync(date);
        
        if (!schedule.IsWorkingDay || schedule.StartTime == null || schedule.EndTime == null)
        {
            return false;
        }
        
        var timeOfDay = date.TimeOfDay;
        return timeOfDay >= schedule.StartTime && timeOfDay < schedule.EndTime;
    }
}
