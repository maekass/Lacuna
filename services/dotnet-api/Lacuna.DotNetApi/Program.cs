using Lacuna.DotNetApi.Configuration;
using Lacuna.DotNetApi.Data;
using Lacuna.DotNetApi.Models;
using Lacuna.DotNetApi.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<LacunaOptions>(builder.Configuration.GetSection(LacunaOptions.SectionName));
builder.Services.PostConfigure<LacunaOptions>(options =>
{
    options.DatasetPath = builder.Configuration["LACUNA_DATASET_PATH"] ?? options.DatasetPath;
    options.DatabaseUrl = builder.Configuration["DATABASE_URL"] ?? options.DatabaseUrl;
    options.CorsOrigins = builder.Configuration["CORS_ORIGINS"] ?? options.CorsOrigins;
    options.ClinicalTrialsApiBase =
        builder.Configuration["CLINICAL_TRIALS_API_BASE"] ?? options.ClinicalTrialsApiBase;
});

builder.Services.AddSingleton<VerifiedDatasetService>();
builder.Services.AddHttpClient<ClinicalTrialsClient>();

var connectionString = ConnectionStringResolver.Resolve(builder.Configuration);
if (!string.IsNullOrWhiteSpace(connectionString))
{
    builder.Services.AddDbContext<LacunaDbContext>(options =>
        options.UseNpgsql(connectionString, npgsql => npgsql.CommandTimeout(10)));
    builder.Services.AddScoped<ResearchStudyService>();
}

builder.Services.AddCors();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc(
        "v1",
        new OpenApiInfo
        {
            Title = "Lacuna .NET API",
            Version = "0.1.0",
            Description =
                "ASP.NET Core + EF Core sidecar for Lacuna — REST access to the verified "
                + "dataset, optional Postgres research studies, and ClinicalTrials.gov proxy.",
        });
});

var app = builder.Build();

var lacunaOptions = app.Services.GetRequiredService<Microsoft.Extensions.Options.IOptions<LacunaOptions>>().Value;
app.UseCors(policy =>
    policy.WithOrigins(lacunaOptions.CorsOriginList.ToArray())
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

var datasetService = app.Services.GetRequiredService<VerifiedDatasetService>();

app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "lacuna-dotnet-api" }));

app.MapGet("/health/ready", async (IServiceProvider services) =>
{
    var datasetOk = datasetService.DatasetExists();
    bool? dbOk = null;

    if (ConnectionStringResolver.IsConfigured(app.Configuration))
    {
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetService<LacunaDbContext>();
        if (dbContext is null)
        {
            dbOk = false;
        }
        else
        {
            try
            {
                dbOk = await dbContext.Database.CanConnectAsync();
            }
            catch
            {
                dbOk = false;
            }
        }
    }

    var ready = datasetOk && dbOk is not false;
    var payload = new
    {
        status = ready ? "ready" : "degraded",
        dataset = datasetOk ? "ok" : "missing",
        database = dbOk switch
        {
            true => "ok",
            false => "unavailable",
            _ => "skipped",
        },
    };

    return ready ? Results.Ok(payload) : Results.Json(payload, statusCode: StatusCodes.Status503ServiceUnavailable);
});

app.MapGet(
    "/api/v1/dataset/verified",
    (
        string resource = "all",
        int limit = 50,
        int offset = 0,
        string? sector = null,
        bool genomics = false,
        bool paginate = false) =>
    {
        var dataset = datasetService.Load();
        var parsedResource = Enum.TryParse<DatasetResource>(resource, ignoreCase: true, out var value)
            ? value
            : DatasetResource.All;
        var clampedLimit = Math.Clamp(limit, 1, 200);
        var clampedOffset = Math.Max(offset, 0);
        var shouldPaginate = paginate
            || parsedResource != DatasetResource.All
            || !string.IsNullOrWhiteSpace(sector)
            || genomics;

        if (!shouldPaginate)
        {
            return Results.Ok(dataset);
        }

        var slice = datasetService.Slice(
            dataset,
            parsedResource,
            clampedLimit,
            clampedOffset,
            sector,
            genomics);
        return Results.Ok(slice);
    });

app.MapGet(
    "/api/v1/research/studies",
    async (
        HttpContext httpContext,
        string? institution,
        string? condition,
        int limit = 20,
        int offset = 0) =>
    {
        if (!ConnectionStringResolver.IsConfigured(app.Configuration))
        {
            return Results.Json(
                new { detail = "DATABASE_URL is not configured for research study queries" },
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }

        var researchStudyService = httpContext.RequestServices.GetService<ResearchStudyService>();
        if (researchStudyService is null)
        {
            return Results.Json(
                new { detail = "DATABASE_URL is not configured for research study queries" },
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }

        try
        {
            var page = await researchStudyService.GetPageAsync(institution, condition, limit, offset);
            return Results.Ok(new
            {
                studies = page.Studies,
                meta = page.Meta,
            });
        }
        catch (ArgumentException ex)
        {
            return Results.BadRequest(new { detail = ex.Message });
        }
    });

app.MapGet(
    "/api/v1/clinical-trials",
    async (
        ClinicalTrialsClient clinicalTrialsClient,
        string condition = "",
        string sponsor = "",
        string phase = "",
        string status = "",
        int limit = 10,
        CancellationToken cancellationToken = default) =>
    {
        try
        {
            var result = await clinicalTrialsClient.SearchAsync(
                condition,
                sponsor,
                phase,
                status,
                limit,
                cancellationToken);
            return Results.Ok(new
            {
                trials = result.Trials,
                total = result.Total,
                query = result.Query,
            });
        }
        catch
        {
            return Results.Json(
                new { detail = "ClinicalTrials.gov is unavailable" },
                statusCode: StatusCodes.Status502BadGateway);
        }
    });

app.Run();

public partial class Program;
