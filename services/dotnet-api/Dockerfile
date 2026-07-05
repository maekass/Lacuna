FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY services/dotnet-api/Lacuna.DotNetApi/Lacuna.DotNetApi.csproj Lacuna.DotNetApi/
RUN dotnet restore Lacuna.DotNetApi/Lacuna.DotNetApi.csproj

COPY services/dotnet-api/Lacuna.DotNetApi/ Lacuna.DotNetApi/
COPY src/data/dataset.verified.json src/data/dataset.verified.json
WORKDIR /src/Lacuna.DotNetApi
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8001 \
    LACUNA_DATASET_PATH=/app/src/data/dataset.verified.json

COPY --from=build /app/publish .
COPY src/data/dataset.verified.json /app/src/data/dataset.verified.json

EXPOSE 8001
ENTRYPOINT ["dotnet", "Lacuna.DotNetApi.dll"]
