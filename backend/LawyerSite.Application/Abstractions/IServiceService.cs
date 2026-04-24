using LawyerSite.Domain.Entities;

namespace LawyerSite.Application.Abstractions;

public interface IServiceService
{
    Task<List<Service>> GetAllAsync(bool onlyActive = false);
    Task<Service?> GetByIdAsync(int id);
    Task<Service> CreateAsync(Service service);
    Task<Service?> UpdateAsync(int id, Service service);
    Task<bool> DeleteAsync(int id);
}
