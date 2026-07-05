namespace Lacuna.DotNetApi.Services;

/// <summary>Locates repo files when running from different working directories.</summary>
public static class RepoPathResolver
{
    public static string? FindRepoFile(params string[] relativeParts)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            var candidate = Path.Combine(
                [directory.FullName, .. relativeParts]);
            if (File.Exists(candidate))
            {
                return candidate;
            }

            directory = directory.Parent;
        }

        var cwdCandidate = Path.Combine([Directory.GetCurrentDirectory(), .. relativeParts]);
        return File.Exists(cwdCandidate) ? cwdCandidate : null;
    }
}
