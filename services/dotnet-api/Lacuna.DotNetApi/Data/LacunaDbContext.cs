using Lacuna.DotNetApi.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Lacuna.DotNetApi.Data;

public sealed class LacunaDbContext(DbContextOptions<LacunaDbContext> options) : DbContext(options)
{
    public DbSet<ResearchStudy> ResearchStudies => Set<ResearchStudy>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ResearchStudy>(entity =>
        {
            entity.HasKey(study => study.StudyId);
            entity.Property(study => study.MarkerGenes).HasColumnType("jsonb");
        });
    }
}
