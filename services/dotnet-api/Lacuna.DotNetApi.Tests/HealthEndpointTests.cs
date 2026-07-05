using System.Net.Http.Json;
using Lacuna.DotNetApi.Models;
using Lacuna.DotNetApi.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Lacuna.DotNetApi.Tests;

public sealed class LacunaWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        var datasetPath = RepoPathResolver.FindRepoFile("src", "data", "dataset.verified.json")
            ?? throw new FileNotFoundException("dataset.verified.json not found for integration tests");

        builder.UseSetting("LACUNA_DATASET_PATH", datasetPath);
    }
}

public sealed class HealthEndpointTests : IClassFixture<LacunaWebApplicationFactory>
{
    private readonly HttpClient _client;

    public HealthEndpointTests(LacunaWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Health_ReturnsOk()
    {
        var response = await _client.GetAsync("/health");
        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        Assert.NotNull(payload);
        Assert.Equal("ok", payload["status"]);
    }
}

public sealed class VerifiedDatasetServiceTests
{
    [Fact]
    public void Slice_CompaniesPagination_RespectsLimit()
    {
        var datasetPath = RepoPathResolver.FindRepoFile("src", "data", "dataset.verified.json")
            ?? throw new FileNotFoundException("dataset.verified.json not found for unit tests");

        var service = new VerifiedDatasetService(
            Microsoft.Extensions.Options.Options.Create(
                new Lacuna.DotNetApi.Configuration.LacunaOptions { DatasetPath = datasetPath }));

        var dataset = service.Load();
        var slice = service.Slice(
            dataset,
            DatasetResource.Companies,
            limit: 5,
            offset: 0);

        Assert.True(slice.Companies.Count <= 5);
        Assert.True(slice.Meta.Total.Companies >= slice.Companies.Count);
        Assert.Equal("companies", slice.Meta.Resource);
    }

    [Fact]
    public void GenomicsFilter_DiagnosticsSector_IsRelevant()
    {
        var company = new Company
        {
            Id = "test",
            Name = "Example Dx",
            Sector = "Diagnostics",
            Description = "General diagnostics",
        };

        Assert.True(GenomicsFilter.IsGenomicsRelevantCompany(company));
    }
}
