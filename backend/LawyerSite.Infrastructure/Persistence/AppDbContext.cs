using Microsoft.EntityFrameworkCore;
using LawyerSite.Domain.Entities;
using LawyerSite.Infrastructure.Persistence.ValueConverters;

namespace LawyerSite.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<Article> Articles => Set<Article>();
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();
    public DbSet<BlockedSlot> BlockedSlots => Set<BlockedSlot>();
    public DbSet<WorkingHour> WorkingHours => Set<WorkingHour>();
    public DbSet<WorkingDay> WorkingDays => Set<WorkingDay>();
    public DbSet<Service> Services => Set<Service>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Настройка конвертера DateTime -> UTC для SQLite
        // SQLite хранит DateTime как локальное время, поэтому нужно явно конвертировать
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTime))
                {
                    property.SetValueConverter(new DateTimeToUtcValueConverter());
                }
                else if (property.ClrType == typeof(DateTime?))
                {
                    property.SetValueConverter(new NullableDateTimeToUtcValueConverter());
                }
            }
        }

        // Настройка Appointment
        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ClientName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.ClientEmail).IsRequired().HasMaxLength(255);
            entity.Property(e => e.ClientPhone).IsRequired().HasMaxLength(50);
            entity.HasIndex(e => e.AppointmentTime);
            entity.HasIndex(e => e.Status);
        });
        
        // Настройка Article
        modelBuilder.Entity<Article>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Excerpt).IsRequired().HasMaxLength(500);
            entity.Property(e => e.CoverImage).HasMaxLength(500);
            entity.Property(e => e.PromoImage).HasMaxLength(500);
            entity.Property(e => e.AuthorName).HasMaxLength(200);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.IsPublished);
            entity.HasIndex(e => e.PublishedDate);
        });
        
        // Настройка AdminUser
        modelBuilder.Entity<AdminUser>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Username).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.Username).IsUnique();
        });
        
        // Настройка BlockedSlot
        modelBuilder.Entity<BlockedSlot>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Comment).HasMaxLength(500);
            entity.HasIndex(e => e.DateTime);
            entity.HasIndex(e => e.IsFullDay);
        });
        
        // Настройка WorkingHour
        modelBuilder.Entity<WorkingHour>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.DayOfWeek).IsUnique();
        });
        
        // Настройка WorkingDay
        modelBuilder.Entity<WorkingDay>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Comment).HasMaxLength(500);
            entity.HasIndex(e => e.Date).IsUnique();
        });

        // Настройка Service
        modelBuilder.Entity<Service>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Price).HasColumnType("decimal(18,2)");
            entity.HasIndex(e => e.IsActive);
        });

        // Настройка связи Appointment и Service
        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.HasOne(a => a.Service)
                  .WithMany(s => s.Appointments)
                  .HasForeignKey(a => a.ServiceId)
                  .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
