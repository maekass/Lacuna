namespace Lacuna.DotNetApi.Models;

public sealed class ClinicalTrial
{
    public required string NctId { get; init; }

    public required string Title { get; init; }

    public required string Phase { get; init; }

    public required string Status { get; init; }

    public required string Condition { get; init; }

    public required string Sponsor { get; init; }

    public required int Enrollment { get; init; }

    public required string StartDate { get; init; }

    public string? CompletionDate { get; init; }

    public List<string> Locations { get; init; } = [];

    public List<string> Interventions { get; init; } = [];
}

public sealed class ClinicalTrialSearchResult
{
    public required List<ClinicalTrial> Trials { get; init; }

    public required int Total { get; init; }

    public required Dictionary<string, string> Query { get; init; }
}
