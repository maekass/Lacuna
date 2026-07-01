import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.dataset import is_genomics_relevant_company, slice_verified_dataset, Company
from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_dataset_summary_graphql(client: TestClient) -> None:
    response = client.post(
        "/graphql",
        json={
            "query": """
            {
              datasetSummary {
                companyCount
                acquisitionCount
                provenance { lastUpdated datasetVersion }
              }
            }
            """
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert "errors" not in payload
    summary = payload["data"]["datasetSummary"]
    assert summary["companyCount"] > 0
    assert summary["acquisitionCount"] > 0
    assert summary["provenance"]["lastUpdated"]


def test_verified_dataset_rest_pagination(client: TestClient) -> None:
    response = client.get(
        "/api/v1/dataset/verified",
        params={"resource": "companies", "limit": 5, "offset": 0, "paginate": "true"},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["companies"]) <= 5
    assert body["meta"]["total"]["companies"] >= len(body["companies"])


def test_genomics_filter() -> None:
    dataset_path = str(get_settings().lacuna_dataset_path)
    from app.dataset import load_verified_dataset

    dataset = load_verified_dataset(dataset_path)
    page = slice_verified_dataset(dataset, resource="companies", genomics=True, limit=200, offset=0)
    assert page.meta.genomics is True
    assert all(is_genomics_relevant_company(Company.model_validate(c.model_dump())) for c in page.companies)


def test_companies_graphql_sector_filter(client: TestClient) -> None:
    response = client.post(
        "/graphql",
        json={
            "query": """
            query ($sector: String!) {
              companies(sector: $sector, limit: 3) {
                total
                items { id name sector }
              }
            }
            """,
            "variables": {"sector": "Diagnostics"},
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert "errors" not in payload
    items = payload["data"]["companies"]["items"]
    assert all(item["sector"] == "Diagnostics" for item in items)
