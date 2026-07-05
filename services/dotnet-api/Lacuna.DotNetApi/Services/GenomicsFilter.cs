using System.Text.RegularExpressions;
using Lacuna.DotNetApi.Models;

namespace Lacuna.DotNetApi.Services;

/// <summary>Heuristic genomics relevance filter — mirrors TypeScript/Python sidecars.</summary>
public static partial class GenomicsFilter
{
    [GeneratedRegex(
        "genomic|genome|sequenc|brca|biomarker|hereditary|carrier screening|cgp|"
            + "profiling|variant|exome|oncotype|pcos|sickle|hbb|lynch|lupus|hla|"
            + "palb2|chek2|dennd1a|fshr",
        RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex GenomicsKeyword();

    public static bool IsGenomicsRelevantCompany(Company company)
    {
        if (company.Sector == "Diagnostics")
        {
            return true;
        }

        var haystack = $"{company.Name} {company.Description}";
        return GenomicsKeyword().IsMatch(haystack);
    }
}
