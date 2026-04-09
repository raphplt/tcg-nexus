import os
from functools import lru_cache


class Settings:
    """
    Centralise les variables d'environnement utilisées côté backend.
    """

    def __init__(self) -> None:
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.image_ttl_seconds = int(os.getenv("IMAGE_TTL_SECONDS", "900"))
        self.analysis_max_candidates = int(os.getenv("ANALYSIS_MAX_CANDIDATES", "5"))
        self.analysis_confidence_threshold = float(
            os.getenv("ANALYSIS_CONFIDENCE_THRESHOLD", "0.82")
        )
        self.max_cards_per_image = int(os.getenv("MAX_CARDS_PER_IMAGE", "4"))
        self.analysis_output_dir = os.getenv("ANALYSIS_OUTPUT_DIR", "output")
        self.analysis_languages = [
            lang.strip()
            for lang in os.getenv("ANALYSIS_LANGUAGES", "fr,en").split(",")
            if lang.strip()
        ] or ["fr"]
        self.analysis_visual_matching = os.getenv("ANALYSIS_VISUAL_MATCHING", "1") == "1"
        self.card_asset_base_url = os.getenv("CARD_ASSET_BASE_URL")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
