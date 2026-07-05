using Npgsql;

namespace Lacuna.DotNetApi.Configuration;

/// <summary>Resolves Postgres connection strings from env vars or config.</summary>
public static class ConnectionStringResolver
{
    public static string? Resolve(IConfiguration configuration)
    {
        var databaseUrl = configuration["DATABASE_URL"]
            ?? configuration.GetSection(LacunaOptions.SectionName)["DatabaseUrl"];

        if (string.IsNullOrWhiteSpace(databaseUrl))
        {
            return null;
        }

        if (databaseUrl.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase)
            || databaseUrl.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase))
        {
            return new NpgsqlConnectionStringBuilder(databaseUrl).ConnectionString;
        }

        return databaseUrl;
    }

    public static bool IsConfigured(IConfiguration configuration) =>
        !string.IsNullOrWhiteSpace(Resolve(configuration));
}
