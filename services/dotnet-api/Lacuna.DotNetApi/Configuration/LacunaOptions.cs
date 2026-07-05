namespace Lacuna.DotNetApi.Configuration;

/// <summary>Environment-driven Lacuna sidecar settings.</summary>
public sealed class LacunaOptions
{
    public const string SectionName = "Lacuna";

    public string DatasetPath { get; set; } = "src/data/dataset.verified.json";

    public string? DatabaseUrl { get; set; }

    public string CorsOrigins { get; set; } = "http://localhost:3000,http://127.0.0.1:3000";

    public string ClinicalTrialsApiBase { get; set; } = "https://clinicaltrials.gov/api/v2";

    public IReadOnlyList<string> CorsOriginList =>
        CorsOrigins
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();
}
