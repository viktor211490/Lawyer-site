using LawyerSite.Domain.Entities;
using LawyerSite.Domain.Enums;

namespace LawyerSite.Application.Abstractions;

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
