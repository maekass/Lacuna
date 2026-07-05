using System.Text.Json;
using Lacuna.DotNetApi.Configuration;
using Microsoft.AspNetCore.WebUtilities;
using Lacuna.DotNetApi.Models;
using Microsoft.Extensions.Options;

namespace Lacuna.DotNetApi.Services;

/// <summary>ClinicalTrials.gov v2 proxy — mirrors the Python sidecar.</summary>
public sealed class ClinicalTrialsClient(HttpClient httpClient, IOptions<LacunaOptions> options)
{
    private const int MaxLimit = 100;

    public async Task<ClinicalTrialSearchResult> SearchAsync(
        string condition = "",
        string sponsor = "",
        string phase = "",
        string status = "",
        int limit = 10,
        CancellationToken cancellationToken = default)
    {
        var clampedLimit = Math.Clamp(limit, 1, MaxLimit);
        var query = new Dictionary<string, string?>
        {
            ["pageSize"] = clampedLimit.ToString(),
            ["sort"] = "LastUpdatePostDate:desc",
        };

        if (!string.IsNullOrWhiteSpace(condition))
        {
            query["query.cond"] = condition;
        }

        if (!string.IsNullOrWhiteSpace(sponsor))
        {
            query["query.spons"] = sponsor;
        }

        if (!string.IsNullOrWhiteSpace(phase))
        {
            query["filter.phase"] = phase;
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query["filter.status"] = status;
        }

        var baseUrl = options.Value.ClinicalTrialsApiBase.TrimEnd('/');
        using var response = await httpClient.GetAsync(
            QueryHelpers.AddQueryString($"{baseUrl}/studies", query),
            cancellationToken);
        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        var root = document.RootElement;

        var studies = root.TryGetProperty("studies", out var studiesElement)
            ? studiesElement.EnumerateArray().Select(MapStudy).ToList()
            : [];

        var total = root.TryGetProperty("totalCount", out var totalElement)
            ? totalElement.GetInt32()
            : studies.Count;

        return new ClinicalTrialSearchResult
        {
            Trials = studies,
            Total = total,
            Query = new Dictionary<string, string>
            {
                ["condition"] = condition,
                ["sponsor"] = sponsor,
                ["phase"] = phase,
                ["status"] = status,
            },
        };
    }

    private static ClinicalTrial MapStudy(JsonElement study)
    {
        var protocol = study.TryGetProperty("protocolSection", out var protocolElement)
            ? protocolElement
            : default;
        var status = GetObject(protocol, "statusModule");
        var identification = GetObject(protocol, "identificationModule");
        var sponsor = GetObject(protocol, "sponsorCollaboratorsModule");
        var design = GetObject(protocol, "designModule");
        var arms = GetObject(protocol, "armsInterventionsModule");
        var contacts = GetObject(protocol, "contactsLocationsModule");

        var locations = new List<string>();
        if (contacts.TryGetProperty("locations", out var locationsElement))
        {
            foreach (var location in locationsElement.EnumerateArray())
            {
                var facility = GetObject(location, "facility");
                var address = GetObject(facility, "address");
                var name = GetString(facility, "name");
                var city = GetString(address, "city");
                var label = $"{name}, {city}".Trim(',', ' ');
                if (!string.IsNullOrWhiteSpace(label))
                {
                    locations.Add(label);
                }
            }
        }

        var interventions = new List<string>();
        if (arms.TryGetProperty("interventions", out var interventionsElement))
        {
            foreach (var intervention in interventionsElement.EnumerateArray())
            {
                var name = GetString(intervention, "name");
                if (!string.IsNullOrWhiteSpace(name))
                {
                    interventions.Add(name);
                }
            }
        }

        var phases = design.TryGetProperty("phases", out var phasesElement)
            && phasesElement.GetArrayLength() > 0
            ? phasesElement[0].GetString() ?? "Not Applicable"
            : "Not Applicable";

        var conditions = protocol.TryGetProperty("conditionsModule", out var conditionsElement)
            && conditionsElement.TryGetProperty("conditions", out var conditionList)
            ? conditionList.EnumerateArray()
                .Select(item => item.GetString())
                .Where(item => !string.IsNullOrWhiteSpace(item))
                .Cast<string>()
                .ToList()
            : [];

        return new ClinicalTrial
        {
            NctId = GetString(identification, "nctId"),
            Title = GetString(identification, "briefTitle"),
            Phase = phases,
            Status = GetString(status, "overallStatus", "Unknown"),
            Condition = string.Join(", ", conditions),
            Sponsor = GetString(GetObject(sponsor, "leadSponsor"), "name", "Unknown"),
            Enrollment = design.TryGetProperty("enrollmentInfo", out var enrollmentElement)
                && enrollmentElement.TryGetProperty("count", out var countElement)
                ? countElement.GetInt32()
                : 0,
            StartDate = GetString(GetObject(status, "startDateStruct"), "date"),
            CompletionDate = status.TryGetProperty("completionDateStruct", out var completionElement)
                && completionElement.TryGetProperty("date", out var completionDate)
                ? completionDate.GetString()
                : null,
            Locations = locations,
            Interventions = interventions,
        };
    }

    private static JsonElement GetObject(JsonElement element, string propertyName) =>
        element.ValueKind == JsonValueKind.Object
        && element.TryGetProperty(propertyName, out var child)
            ? child
            : default;

    private static string GetString(JsonElement element, string propertyName, string fallback = "") =>
        element.ValueKind == JsonValueKind.Object
        && element.TryGetProperty(propertyName, out var value)
        && value.ValueKind == JsonValueKind.String
            ? value.GetString() ?? fallback
            : fallback;
}
