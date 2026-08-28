"""
Computer Vision module — pHash-based duplicate image detection.

For Slice 1:
- Computes perceptual hash (pHash) of uploaded images
- Compares against the image_hash table
- Returns duplicate signal if Hamming distance < threshold

Satellite-based progress estimation is deferred to Slice 2.
"""
from __future__ import annotations
import io
import os
from pathlib import Path

import imagehash
from PIL import Image

from config import settings


def compute_phash(image_bytes: bytes) -> str:
    """Return 16-char hex pHash string for the given image bytes."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return str(imagehash.phash(img))


def hamming_distance(hash_a: str, hash_b: str) -> int:
    """Compute Hamming distance between two hex pHash strings."""
    ha = imagehash.hex_to_hash(hash_a)
    hb = imagehash.hex_to_hash(hash_b)
    return ha - hb


def is_duplicate(new_hash: str, existing_hashes: list[dict]) -> tuple[bool, str | None]:
    """
    Compare new_hash against a list of existing hash records.

    Args:
        new_hash: Hex pHash string of the new image.
        existing_hashes: List of dicts with keys: hash_id, phash.

    Returns:
        (is_dup: bool, matched_hash_id: str | None)
    """
    threshold = settings.PHASH_HAMMING_THRESHOLD
    for record in existing_hashes:
        dist = hamming_distance(new_hash, record["phash"])
        if dist < threshold:
            return True, record["hash_id"]
    return False, None


def save_upload(image_bytes: bytes, filename: str) -> str:
    """
    Save uploaded image bytes to UPLOAD_DIR.
    Returns the relative file path.
    """
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(filename).name  # strip any path traversal
    dest = upload_dir / safe_name
    dest.write_bytes(image_bytes)
    return str(dest)


# ---------------------------------------------------------------------------
# Satellite progress estimation (stubbed — preloaded sample data)
# ---------------------------------------------------------------------------

# For MVP: progress is pre-seeded per project. Real CV deferred.
SATELLITE_PROGRESS_SAMPLES: dict[str, dict] = {
    "MPL-2026-1042": {
        "ai_evidence_pct": 31,
        "source": "SATELLITE_SAMPLE",
        "confidence": "MEDIUM",
        "image_date": "2026-08-01",
    },
    "MPL-2026-1043": {
        "ai_evidence_pct": 72,
        "source": "SATELLITE_SAMPLE",
        "confidence": "HIGH",
        "image_date": "2026-08-15",
    },
}


def get_satellite_progress(project_id: str) -> dict | None:
    """Return pre-seeded satellite progress estimate for a project."""
    return SATELLITE_PROGRESS_SAMPLES.get(project_id)
