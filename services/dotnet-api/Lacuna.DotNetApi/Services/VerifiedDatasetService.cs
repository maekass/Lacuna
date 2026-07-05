using System.Text.Json;
using Lacuna.DotNetApi.Configuration;
using Lacuna.DotNetApi.Models;
using Microsoft.Extensions.Options;

namespace Lacuna.DotNetApi.Services;

/// <summary>Loads and slices the verified JSON dataset from disk.</summary>
public sealed class VerifiedDatasetService(IOptions<LacunaOptions> options)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private VerifiedDataset? _cache;

    public string DatasetPath => ResolveDatasetPath(options.Value.DatasetPath);

    public bool DatasetExists() => File.Exists(DatasetPath);

    public VerifiedDataset Load()
    {
        _cache ??= LoadFromDisk(DatasetPath);
        return _cache;
    }

    public DatasetSlice Slice(
        VerifiedDataset dataset,
        DatasetResource resource = DatasetResource.All,
        int limit = 50,
        int offset = 0,
        string? sector = null,
        bool genomics = false)
    {
        var companiesById = dataset.Companies.ToDictionary(company => company.Id);
        var companies = dataset.Companies.ToList();
        var acquisitions = dataset.Acquisitions.ToList();

        if (!string.IsNullOrWhiteSpace(sector))
        {
            companies = companies.Where(company => company.Sector == sector).ToList();
            var sectorIds = companies.Select(company => company.Id).ToHashSet();
            acquisitions = acquisitions
                .Where(deal => sectorIds.Contains(deal.TargetId))
                .ToList();
        }

        if (genomics)
        {
            companies = companies.Where(GenomicsFilter.IsGenomicsRelevantCompany).ToList();
            acquisitions = acquisitions
                .Where(deal =>
                    companiesById.TryGetValue(deal.TargetId, out var target)
                    && GenomicsFilter.IsGenomicsRelevantCompany(target))
                .ToList();
        }

        var totals = new DatasetTotals
        {
            Companies = companies.Count,
            Acquisitions = acquisitions.Count,
            Acquirers = dataset.Acquirers.Count,
        };

        return new DatasetSlice
        {
            Provenance = dataset.Provenance,
            Companies = resource is DatasetResource.All or DatasetResource.Companies
                ? Paginate(companies, limit, offset)
                : [],
            Acquisitions = resource is DatasetResource.All or DatasetResource.Acquisitions
                ? Paginate(acquisitions, limit, offset)
                : [],
            Acquirers = resource is DatasetResource.All or DatasetResource.Acquirers
                ? Paginate(dataset.Acquirers, limit, offset)
                : [],
            Meta = new DatasetMeta
            {
                Resource = resource.ToString().ToLowerInvariant(),
                Limit = limit,
                Offset = offset,
                Sector = sector,
                Genomics = genomics,
                Total = totals,
            },
        };
    }

    internal static VerifiedDataset LoadFromDisk(string path)
    {
        using var stream = File.OpenRead(path);
        var dataset = JsonSerializer.Deserialize<VerifiedDataset>(stream, JsonOptions)
            ?? throw new InvalidOperationException($"Failed to parse verified dataset at {path}");
        return dataset;
    }

    private static List<T> Paginate<T>(IReadOnlyList<T> items, int limit, int offset) =>
        items.Skip(offset).Take(limit).ToList();

    private static string ResolveDatasetPath(string configuredPath)
    {
        if (Path.IsPathRooted(configuredPath))
        {
            return configuredPath;
        }

        var relativeParts = configuredPath
            .Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
            .Where(part => part.Length > 0)
            .ToArray();

        return RepoPathResolver.FindRepoFile(relativeParts)
            ?? Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), configuredPath));
    }
}
