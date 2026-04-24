using LawyerSite.Domain.Entities;

namespace LawyerSite.Application.Abstractions;

public interface IBlockSlotService
{
    Task<List<BlockedSlot>> GetAllAsync();
    Task<List<BlockedSlot>> GetByDateRangeAsync(DateTime start, DateTime end);
    Task<List<BlockedSlot>> GetByDayAsync(DateTime day);
    Task<BlockedSlot?> GetByIdAsync(int id);
    Task<BlockedSlot> CreateAsync(BlockedSlot slot);
    Task<bool> DeleteAsync(int id);
    Task<bool> IsSlotBlocked(DateTime time);
    Task<bool> IsDayBlocked(DateTime day);
}
