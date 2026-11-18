from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


_REPO_ROOT = Path(__file__).resolve().parents[3]
_DEFAULT_DATASET = _REPO_ROOT / "src" / "data" / "dataset.verified.json"
_DEFAULT_COMPLETION_REGISTRY = Path(__file__).resolve().parents[1] / "model_registry" / "completion"
_DEFAULT_SHADOW_LOG = Path(__file__).resolve().parents[1] / "var" / "completion_shadow_log.jsonl"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    lacuna_dataset_path: Path = _DEFAULT_DATASET
    database_url: str | None = None
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    clinical_trials_api_base: str = "https://clinicaltrials.gov/api/v2"
    completion_registry_dir: Path = _DEFAULT_COMPLETION_REGISTRY
    # Append-only shadow log for API predictions (gitignored). "off" disables.
    completion_shadow_log: str = str(_DEFAULT_SHADOW_LOG)

    @property
    def completion_shadow_log_path(self) -> Path | None:
        value = self.completion_shadow_log.strip()
        return None if value.lower() in {"", "off", "none", "false", "0"} else Path(value)

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
