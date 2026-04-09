import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from app.config import get_settings

logger = logging.getLogger("app.analysis.report")


class AnalysisReportWriter:
    """
    Persiste un snapshot JSON des analyses pour faciliter le debug et l'audit.
    """

    def __init__(self) -> None:
        settings = get_settings()
        self._output_dir = Path(settings.analysis_output_dir)
        self._output_dir.mkdir(parents=True, exist_ok=True)

    def write_batch(self, payload: Dict[str, Any]) -> Path:
        timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        filename = self._output_dir / f"batch_{payload.get('batch_id')}_{timestamp}.json"

        with filename.open("w", encoding="utf-8") as handler:
            json.dump(payload, handler, ensure_ascii=False, indent=2)

        logger.info("✅ Rapport d'analyse écrit dans %s", filename)
        return filename
