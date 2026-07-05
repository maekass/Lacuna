namespace Lacuna.DotNetApi.Models;

public sealed class Provenance
{
    public required string LastUpdated { get; init; }

    public string? DatasetVersion { get; init; }

    public required List<string> Sources { get; init; }

    public List<string> Notes { get; init; } = [];

    public required string Purpose { get; init; }

    public required string Disclaimer { get; init; }
}

public sealed class Company
{
    public required string Id { get; init; }

    public required string Name { get; init; }

    public string Sector { get; init; } = "Unknown";

    public string Stage { get; init; } = string.Empty;

    public int Founded { get; init; }

    public string Hq { get; init; } = string.Empty;

    public string Description { get; init; } = string.Empty;

    public double? LastKnownValuation { get; init; }

    public string? ValuationSource { get; init; }

    public double? TotalFunding { get; init; }

    public List<string>? Sources { get; init; }

    public string? EvidenceClass { get; init; }
}

public sealed class Acquirer
{
    public required string Id { get; init; }

    public required string Name { get; init; }

    public string? Ticker { get; init; }

    public string? Sector { get; init; }

    public string Hq { get; init; } = string.Empty;

    public string? Type { get; init; }

    public string? Description { get; init; }
}

public sealed class Acquisition
{
    public required string Id { get; init; }

    public required string TargetId { get; init; }

    public required string AcquirerId { get; init; }

    public required string TargetName { get; init; }

    public required string AcquirerName { get; init; }

    public required string AnnouncedDate { get; init; }

    public required string DealType { get; init; }

    public required string Source { get; init; }

    public string StrategicRationale { get; init; } = string.Empty;

    public string? ClosedDate { get; init; }

    public double? DealValue { get; init; }

    public string? DealValueNote { get; init; }
}

public sealed class VerifiedDataset
{
    public required Provenance Provenance { get; init; }

    public required List<Company> Companies { get; init; }

    public required List<Acquirer> Acquirers { get; init; }

    public required List<Acquisition> Acquisitions { get; init; }
}

public enum DatasetResource
{
    All,
    Companies,
    Acquisitions,
    Acquirers,
}

public sealed class DatasetMeta
{
    public required string Resource { get; init; }

    public required int Limit { get; init; }

    public required int Offset { get; init; }

    public string? Sector { get; init; }

    public bool Genomics { get; init; }

    public required DatasetTotals Total { get; init; }
}

public sealed class DatasetTotals
{
    public required int Companies { get; init; }

    public required int Acquisitions { get; init; }

    public required int Acquirers { get; init; }
}

public sealed class DatasetSlice
{
    public required Provenance Provenance { get; init; }

    public required List<Company> Companies { get; init; }

    public required List<Acquirer> Acquirers { get; init; }

    public required List<Acquisition> Acquisitions { get; init; }

    public required DatasetMeta Meta { get; init; }
}

public sealed class ResearchStudyDto
{
    public required string StudyId { get; init; }

    public required string Institution { get; init; }

    public required int SampleSize { get; init; }

    public required string Source { get; init; }

    public required List<string> MarkerGenes { get; init; }
}

public sealed class ResearchStudyPage
{
    public required List<ResearchStudyDto> Studies { get; init; }

    public required ResearchStudyMeta Meta { get; init; }
}

public sealed class ResearchStudyMeta
{
    public required int Total { get; init; }

    public required int Limit { get; init; }

    public required int Offset { get; init; }
}
