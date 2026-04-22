namespace LawyerSite.Api.Domain;

public enum AppointmentStatus
{
    Scheduled = 0,    // Запланировано
    Confirmed = 1,    // Подтверждено
    Cancelled = 2,    // Отменено
    Completed = 3     // Завершено
}
