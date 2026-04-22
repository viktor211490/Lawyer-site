using Microsoft.EntityFrameworkCore;
using PsychoSite.Api.Data;
using PsychoSite.Api.Domain;

namespace PsychoSite.Api.Services;

public interface IAppointmentService
{
    Task<List<Appointment>> GetAllAsync();
    Task<List<Appointment>> GetAvailableSlotsAsync(DateTime startDate, CancellationToken cancellationToken, int days = 7, int? serviceId = null);
    Task<Appointment?> GetByIdAsync(int id);
    Task<Appointment> CreateAsync(Appointment appointment);
    Task<Appointment?> UpdateAsync(int id, Appointment appointment);
    Task<bool> DeleteAsync(int id);
    Task<bool> IsSlotAvailable(DateTime time, int durationMinutes = 60);
    Task<List<Appointment>> GetCalendarViewAsync(DateTime monthDate);
    Task<Appointment?> UpdateStatusAsync(int id, AppointmentStatus status);
    Task<Dictionary<string, List<Appointment>>> GetAppointmentsByDayAsync(DateTime day);
    Task<ServicesDayStatisticsDto> GetDayStatisticsAsync(DateTime day);
}

public class ServicesDayStatisticsDto
{
    public DateTime Date { get; set; }
    public int TotalAppointments { get; set; }
    public int ConfirmedAppointments { get; set; }
    public int CancelledAppointments { get; set; }
    public int ScheduledAppointments { get; set; }
    public List<Appointment> Appointments { get; set; } = new();
}

public class AppointmentService : IAppointmentService
{
    private readonly AppDbContext _context;
    private readonly IWorkingHoursService _workingHoursService;
    private readonly IBlockSlotService _blockSlotService;

    public AppointmentService(AppDbContext context, IWorkingHoursService workingHoursService, IBlockSlotService blockSlotService)
    {
        _context = context;
        _workingHoursService = workingHoursService;
        _blockSlotService = blockSlotService;
    }
    
    public async Task<List<Appointment>> GetAllAsync()
    {
        return await _context.Appointments
            .OrderByDescending(a => a.AppointmentTime)
            .ToListAsync();
    }
    
    public async Task<List<Appointment>> GetAvailableSlotsAsync(DateTime startDate, CancellationToken cancellationToken, int days = 7, int? serviceId = null)
    {
        // Получаем длительность услуги если указана
        int serviceDurationMinutes = 60;
        if (serviceId.HasValue)
        {
            var service = await _context.Services.FindAsync(serviceId.Value);
            if (service != null && service.IsActive)
            {
                serviceDurationMinutes = service.DurationMinutes;
            }
        }

        var allAppointments = await _context.Appointments
            .Include(a => a.Service)
            .ToListAsync();

        var allBlockedSlots = await _context.BlockedSlots.ToListAsync();

        var slots = new List<Appointment>();

        for (int day = 0; day < days; day++)
        {
            var currentDate = startDate.AddDays(day);

            // Получаем расписание на день
            var daySchedule = await _workingHoursService.GetDayScheduleAsync(currentDate);

            // Пропускаем нерабочие дни
            if (!daySchedule.IsWorkingDay || daySchedule.StartTime == null || daySchedule.EndTime == null)
            {
                continue;
            }

            // Получаем перерыв из расписания
            var breakMinutes = daySchedule.BreakBetweenSlotsMinutes;

            // Шаг генерации слотов = slotDurationMinutes (например, 15 мин)
            var slotStep = daySchedule.SlotDurationMinutes;

            // Получаем блокировки на день
            var dayBlockedSlots = allBlockedSlots.Where(b => b.DateTime.Date == currentDate.Date).ToList();
            var dayAppointments = allAppointments.Where(a => a.AppointmentTime.Date == currentDate.Date && a.Status != AppointmentStatus.Cancelled).ToList();

            // Генерируем ВСЕ слоты рабочего дня с шагом slotDurationMinutes
            var slotStartTime = currentDate.Date.Add(daySchedule.StartTime.Value);
            var workEndTime = currentDate.Date.Add(daySchedule.EndTime.Value);

            while (slotStartTime < workEndTime)
            {
                // Блокируем слоты которые уже прошли (в московском времени)
                var slotLocalMoscow = PsychoSite.Api.Time.MoscowTimeProvider.ConvertToMoscow(slotStartTime);
                var moscowNow = PsychoSite.Api.Time.MoscowTimeProvider.GetMoscowNow();
                var isPast = slotLocalMoscow < moscowNow;

                // Для каждого слота проверяем, можно ли записать услугу выбранной длительности
                var canFitService = slotStartTime.AddMinutes(serviceDurationMinutes) <= workEndTime;

                // Проверяем, не занят ли слот на всю длительность услуги
                var isTaken = false;
                if (canFitService && !isPast)
                {
                    isTaken = dayAppointments.Any(a =>
                    {
                        if (a.Status == AppointmentStatus.Cancelled) return false;

                        // Учитываем перерыв после существующей записи
                        var appointmentEndWithBreak = a.AppointmentTime.AddMinutes(a.DurationMinutes).AddMinutes(breakMinutes);
                        var slotEnd = slotStartTime.AddMinutes(serviceDurationMinutes);

                        // Проверяем пересечение
                        return (a.AppointmentTime < slotEnd && appointmentEndWithBreak > slotStartTime);
                    });
                }
                else if (isPast)
                {
                    // Если время прошло - помечаем как занятое
                    isTaken = true;
                }
                else
                {
                    // Если услуга не помещается, помечаем как занятый
                    isTaken = true;
                }

                // Проверяем, не заблокирован ли слот
                var isBlocked = dayBlockedSlots.Any(b =>
                {
                    var blockEnd = b.DateTime.AddHours(b.DurationHours).AddMinutes(b.DurationMinutes);
                    return (b.DateTime < slotStartTime && blockEnd > slotStartTime);
                });

                    slots.Add(new Appointment
                    {
                        AppointmentTime = PsychoSite.Api.Time.MoscowTimeProvider.ConvertToMoscow(slotStartTime), // Moscow-local time
                        Status = (isTaken || isBlocked) ? AppointmentStatus.Confirmed : AppointmentStatus.Scheduled,
                        IsBlocked = isBlocked,
                        DurationMinutes = slotStep // Длительность слота (шаг)
                    });

                // Следующий слот с шагом slotDurationMinutes
                slotStartTime = slotStartTime.AddMinutes(slotStep);
            }
        }

        return slots;
    }
    
    public async Task<Appointment?> GetByIdAsync(int id)
    {
        return await _context.Appointments.FindAsync(id);
    }
    
    public async Task<Appointment> CreateAsync(Appointment appointment)
    {
        // Если указана услуга, получаем её длительность
        if (appointment.ServiceId.HasValue)
        {
            var service = await _context.Services.FindAsync(appointment.ServiceId.Value);
            if (service != null && service.IsActive)
            {
                appointment.DurationMinutes = service.DurationMinutes;
            }
        }

        // Проверяем, не занят ли слот на всю длительность услуги
        if (!await IsSlotAvailable(appointment.AppointmentTime, appointment.DurationMinutes))
        {
            throw new InvalidOperationException("Это время уже занято");
        }

        // Проверяем, не заблокирован ли слот
        if (await _blockSlotService.IsSlotBlocked(appointment.AppointmentTime))
        {
            throw new InvalidOperationException("Это время заблокировано");
        }

        // Проверяем, не выходной ли день
        if (!await _workingHoursService.IsWorkingDayAsync(appointment.AppointmentTime.Date))
        {
            throw new InvalidOperationException("Приём не ведётся в этот день");
        }

        // Проверяем рабочие часы (с учётом длительности)
        if (!await _workingHoursService.IsWorkingHoursAsync(appointment.AppointmentTime))
        {
            throw new InvalidOperationException("Приём ведётся только в рабочие часы");
        }

        appointment.CreatedAt = DateTime.UtcNow;
        appointment.Status = AppointmentStatus.Scheduled;

        _context.Appointments.Add(appointment);
        await _context.SaveChangesAsync();

        return appointment;
    }
    
    public async Task<Appointment?> UpdateAsync(int id, Appointment appointment)
    {
        var existing = await _context.Appointments.FindAsync(id);
        if (existing == null)
        {
            return null;
        }

        // Если указана услуга, получаем её длительность
        if (appointment.ServiceId.HasValue)
        {
            var service = await _context.Services.FindAsync(appointment.ServiceId.Value);
            if (service != null && service.IsActive)
            {
                appointment.DurationMinutes = service.DurationMinutes;
            }
        }
        else
        {
            // Если услуга не указана, сохраняем старую длительность
            appointment.DurationMinutes = existing.DurationMinutes;
        }

        // Если меняем время, проверяем доступность на всю длительность
        if (appointment.AppointmentTime != existing.AppointmentTime)
        {
            if (!await IsSlotAvailable(appointment.AppointmentTime, appointment.DurationMinutes))
            {
                throw new InvalidOperationException("Это время уже занято");
            }
        }

        existing.ClientName = appointment.ClientName;
        existing.ClientEmail = appointment.ClientEmail;
        existing.ClientPhone = appointment.ClientPhone;
        existing.AppointmentTime = appointment.AppointmentTime;
        existing.Notes = appointment.Notes;
        existing.IsBlocked = appointment.IsBlocked;
        existing.BlockReason = appointment.BlockReason;
        existing.ServiceId = appointment.ServiceId;
        existing.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return existing;
    }
    
    public async Task<bool> DeleteAsync(int id)
    {
        var appointment = await _context.Appointments.FindAsync(id);
        if (appointment == null)
        {
            return false;
        }
        
        // Можно удалять только отменённые или заблокированные
        if (appointment.Status != AppointmentStatus.Cancelled && !appointment.IsBlocked)
        {
            throw new InvalidOperationException("Можно удалять только отменённые записи");
        }
        
        _context.Appointments.Remove(appointment);
        await _context.SaveChangesAsync();
        
        return true;
    }
    
    public async Task<bool> IsSlotAvailable(DateTime time, int durationMinutes = 60)
    {
        var slotEnd = time.AddMinutes(durationMinutes);

        // Проверяем пересечения с записями
        var hasAppointmentOverlap = await _context.Appointments.AnyAsync(a =>
            a.Status != AppointmentStatus.Cancelled &&
            a.AppointmentTime < slotEnd &&
            a.AppointmentTime.AddMinutes(a.DurationMinutes) > time);

        if (hasAppointmentOverlap)
        {
            return false;
        }

        // Проверяем, не заблокирован ли слот
        var hasBlockOverlap = await _blockSlotService.IsSlotBlocked(time);
        if (hasBlockOverlap)
        {
            return false;
        }

        return true;
    }
    
    public async Task<List<Appointment>> GetCalendarViewAsync(DateTime monthDate)
    {
        var startDate = new DateTime(monthDate.Year, monthDate.Month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var response = await _context.Appointments
            .Include(a => a.Service)
            .Where(a => a.AppointmentTime >= startDate && a.AppointmentTime <= endDate)
            .OrderBy(a => a.AppointmentTime)
            .ToListAsync();
        return response;
    }
    
    public async Task<Appointment?> UpdateStatusAsync(int id, AppointmentStatus status)
    {
        var appointment = await _context.Appointments.FindAsync(id);
        if (appointment == null)
        {
            return null;
        }
        
        appointment.Status = status;
        
        if (status == AppointmentStatus.Confirmed)
        {
            appointment.ConfirmedAt = DateTime.UtcNow;
        }
        else if (status == AppointmentStatus.Cancelled)
        {
            appointment.CancelledAt = DateTime.UtcNow;
        }
        
        await _context.SaveChangesAsync();

        return appointment;
    }
    
    public async Task<Dictionary<string, List<Appointment>>> GetAppointmentsByDayAsync(DateTime day)
    {
        var start = day.Date;
        var end = start.AddDays(1);
        
        var appointments = await _context.Appointments
            .Where(a => a.AppointmentTime >= start && a.AppointmentTime < end)
            .OrderBy(a => a.AppointmentTime)
            .ToListAsync();
        
        return new Dictionary<string, List<Appointment>>
        {
            { day.ToString("yyyy-MM-dd"), appointments }
        };
    }
    
    public async Task<ServicesDayStatisticsDto> GetDayStatisticsAsync(DateTime day)
    {
        var start = day.Date;
        var end = start.AddDays(1);

        var appointments = await _context.Appointments
            .Include(a => a.Service)
            .Where(a => a.AppointmentTime >= start && a.AppointmentTime < end)
            .OrderBy(a => a.AppointmentTime)
            .ToListAsync();

        return new ServicesDayStatisticsDto
        {
            Date = day,
            TotalAppointments = appointments.Count,
            ConfirmedAppointments = appointments.Count(a => a.Status == AppointmentStatus.Confirmed),
            CancelledAppointments = appointments.Count(a => a.Status == AppointmentStatus.Cancelled),
            ScheduledAppointments = appointments.Count(a => a.Status == AppointmentStatus.Scheduled),
            Appointments = appointments
        };
    }
}
