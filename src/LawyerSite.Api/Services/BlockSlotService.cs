using Microsoft.EntityFrameworkCore;
using LawyerSite.Api.Data;
using LawyerSite.Api.Domain;

namespace LawyerSite.Api.Services;

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

public class BlockSlotService : IBlockSlotService
{
    private readonly AppDbContext _context;
    
    public BlockSlotService(AppDbContext context)
    {
        _context = context;
    }
    
    public async Task<List<BlockedSlot>> GetAllAsync()
    {
        return await _context.BlockedSlots
            .OrderByDescending(b => b.DateTime)
            .ToListAsync();
    }
    
    public async Task<List<BlockedSlot>> GetByDateRangeAsync(DateTime start, DateTime end)
    {
        return await _context.BlockedSlots
            .Where(b => b.DateTime >= start && b.DateTime <= end)
            .OrderBy(b => b.DateTime)
            .ToListAsync();
    }
    
    public async Task<List<BlockedSlot>> GetByDayAsync(DateTime day)
    {
        var start = day.Date;
        var end = start.AddDays(1);
        
        return await _context.BlockedSlots
            .Where(b => b.DateTime >= start && b.DateTime < end)
            .OrderBy(b => b.DateTime)
            .ToListAsync();
    }
    
    public async Task<BlockedSlot?> GetByIdAsync(int id)
    {
        return await _context.BlockedSlots.FindAsync(id);
    }
    
    public async Task<BlockedSlot> CreateAsync(BlockedSlot slot)
    {
        slot.CreatedAt = DateTime.UtcNow;

        // Если блокировка всего дня, устанавливаем время на начало дня
        if (slot.IsFullDay)
        {
            slot.DateTime = slot.DateTime.Date;
            slot.DurationHours = 24;
            slot.DurationMinutes = 0;
        }

        _context.BlockedSlots.Add(slot);
        await _context.SaveChangesAsync();

        return slot;
    }
    
    public async Task<bool> DeleteAsync(int id)
    {
        var slot = await _context.BlockedSlots.FindAsync(id);
        if (slot == null)
        {
            return false;
        }
        
        _context.BlockedSlots.Remove(slot);
        await _context.SaveChangesAsync();
        
        return true;
    }
    
    public async Task<bool> IsSlotBlocked(DateTime time)
    {
        var allBlocks = await _context.BlockedSlots.ToListAsync();
        return allBlocks.Any(b =>
        {
            if (b.IsFullDay)
            {
                return b.DateTime.Date == time.Date;
            }

            var slotEnd = b.DateTime.AddHours(b.DurationHours).AddMinutes(b.DurationMinutes);
            return time >= b.DateTime && time < slotEnd;
        });
    }
    
    public async Task<bool> IsDayBlocked(DateTime day)
    {
        return await _context.BlockedSlots.AnyAsync(b => 
            b.IsFullDay && b.DateTime.Date == day.Date);
    }
}
