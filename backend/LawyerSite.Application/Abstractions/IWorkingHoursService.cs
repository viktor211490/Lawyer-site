using LawyerSite.Application.Contracts;
using LawyerSite.Domain.Entities;

namespace LawyerSite.Application.Abstractions;

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
    public bool IsCustomSchedule { get; set; }
}
