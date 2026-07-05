using Lacuna.DotNetApi.Data;
using Lacuna.DotNetApi.Models;
using Microsoft.EntityFrameworkCore;

namespace Lacuna.DotNetApi.Services;

/// <summary>EF Core queries for domestic research_studies catalog.</summary>
public sealed class ResearchStudyService(LacunaDbContext dbContext)
{
    private static readonly HashSet<string> AllowedInstitutions =
    [
        "nih",
        "harvard",
        "mit",
        "harvard_mit_collab",
    ];

    public async Task<ResearchStudyPage> GetPageAsync(
        string? institution = null,
        string? condition = null,
        int limit = 20,
        int offset = 0,
        CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrWhiteSpace(institution) && !AllowedInstitutions.Contains(institution))
        {
            throw new ArgumentException(
                $"institution must be one of: {string.Join(", ", AllowedInstitutions)}",
                nameof(institution));
        }

        var clampedLimit = Math.Clamp(limit, 1, 100);
        var clampedOffset = Math.Max(offset, 0);

        var query = dbContext.ResearchStudies.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(institution))
        {
            query = query.Where(study => study.Institution == institution);
        }

        if (!string.IsNullOrWhiteSpace(condition))
        {
            var pattern = $"%{condition}%";
            query = query.Where(study =>
                EF.Functions.ILike(study.Source, pattern)
                || EF.Functions.ILike(study.StudyId, pattern)
                || study.MarkerGenes.Any(gene => EF.Functions.ILike(gene, pattern)));
        }

        var total = await query.CountAsync(cancellationToken);
        var studies = await query
            .OrderBy(study => study.StudyId)
            .Skip(clampedOffset)
            .Take(clampedLimit)
            .Select(study => new ResearchStudyDto
            {
                StudyId = study.StudyId,
                Institution = study.Institution,
                SampleSize = study.SampleSize,
                Source = study.Source,
                MarkerGenes = study.MarkerGenes,
            })
            .ToListAsync(cancellationToken);

        return new ResearchStudyPage
        {
            Studies = studies,
            Meta = new ResearchStudyMeta
            {
                Total = total,
                Limit = clampedLimit,
                Offset = clampedOffset,
            },
        };
    }
}
