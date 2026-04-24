using Microsoft.EntityFrameworkCore;
using LawyerSite.Application.Abstractions;
using LawyerSite.Domain.Entities;
using LawyerSite.Infrastructure.Persistence;

namespace LawyerSite.Infrastructure.Services;

public class ServiceService : IServiceService
{
    private readonly AppDbContext _context;

    public ServiceService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Service>> GetAllAsync(bool onlyActive = false)
    {
        var query = _context.Services.AsQueryable();

        if (onlyActive)
        {
            query = query.Where(s => s.IsActive);
        }

        return await query.OrderByDescending(s => s.CreatedAt).ToListAsync();
    }

    public async Task<Service?> GetByIdAsync(int id)
    {
        return await _context.Services.FindAsync(id);
    }

    public async Task<Service> CreateAsync(Service service)
    {
        service.CreatedAt = DateTime.UtcNow;
        _context.Services.Add(service);
        await _context.SaveChangesAsync();
        return service;
    }

    public async Task<Service?> UpdateAsync(int id, Service service)
    {
        var existing = await _context.Services.FindAsync(id);
        if (existing == null) return null;

        existing.Title = service.Title;
        existing.Emoji = service.Emoji;
        existing.Description = service.Description;
        existing.Price = service.Price;
        existing.IsActive = service.IsActive;
        existing.DurationMinutes = service.DurationMinutes;
        existing.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var service = await _context.Services.FindAsync(id);
        if (service == null) return false;

        // Нельзя удалить услугу, если есть записи
        if (_context.Appointments.Any(a => a.ServiceId == id))
        {
            throw new InvalidOperationException("Нельзя удалить услугу с существующими записями");
        }

        _context.Services.Remove(service);
        await _context.SaveChangesAsync();
        return true;
    }
}
