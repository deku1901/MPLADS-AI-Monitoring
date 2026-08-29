"""
Split-Work Detection Engine — Vertical Slice 4.

Detects artificial splitting of MPLADS works (slicing a single major contract into
multiple smaller work orders below the statutory e-tender threshold to avoid public
procurement rules).

Detection approach:
1. Geospatial clustering: projects within <=3 km in the same constituency/category.
2. NLP corridor/reach pattern matching: Reach 1/2/3, Phase 1/2, from X to Y / Y to Z,
   chainage ranges.
3. Semantic similarity using the existing nlp.py infrastructure (threshold >= 0.75).
4. Procurement threshold check:
   - Each individual project cost <= TENDER_DIRECT_QUOTATION_CEILING (₹5,00,000)
   - Aggregate cluster cost >= TENDER_MANDATORY_THRESHOLD (₹10,00,000)
"""
from __future__ import annotations

import logging
import math
import re
import uuid
from typing import Any

from ai_engine.nlp import compute_semantic_similarity, _tokenize, _extract_keywords

logger = logging.getLogger("split_work")

# Statutory procurement thresholds (INR)
TENDER_DIRECT_QUOTATION_CEILING = 5_00_000   # ₹5 Lakh — direct quotation limit
TENDER_MANDATORY_THRESHOLD = 10_00_000        # ₹10 Lakh — mandatory e-tender threshold
GEO_PROXIMITY_KM = 3.0                        # Max distance for geographic cluster
SEMANTIC_SIMILARITY_THRESHOLD = 0.75          # Min similarity to flag corridor relationship

# Regex patterns for corridor/reach/phase detection
CORRIDOR_PATTERNS = [
    # "Reach 1", "Reach-2", "Reach No. 3"
    re.compile(r"\breach[\s\-]+(?:no\.?\s*)?(\d+)\b", re.IGNORECASE),
    # "Phase 1", "Phase-II", "Phase 2"
    re.compile(r"\bphase[\s\-]+(?:no\.?\s*)?(\d+|[IVX]+)\b", re.IGNORECASE),
    # "Part 1", "Part-2"
    re.compile(r"\bpart[\s\-]+(?:no\.?\s*)?(\d+)\b", re.IGNORECASE),
    # "Chainage 0-500m", "Ch. 500 to 1000"
    re.compile(r"\b(?:chainage|ch\.?)\s*[\d,]+\s*(?:to|[-–])\s*[\d,]+\s*(?:m|km)?\b", re.IGNORECASE),
    # "from X to Y" — route description
    re.compile(r"\bfrom\s+\S+(?:\s+\S+)?\s+to\s+\S+", re.IGNORECASE),
]

# Keywords that strongly indicate a physical corridor or road/path work
CORRIDOR_KEYWORDS = {
    "road", "cc", "wbm", "bitumen", "metalling", "drain", "nala",
    "reach", "phase", "chainage", "from", "stretch", "length", "km",
    "metre", "feet", "link", "approach", "path", "lane", "street",
}


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine great-circle distance in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return R * 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


def _has_corridor_pattern(text: str) -> bool:
    """Return True if the text contains any reach/phase/chainage pattern."""
    for pat in CORRIDOR_PATTERNS:
        if pat.search(text):
            return True
    return False


def _corridor_keyword_overlap(text1: str, text2: str) -> float:
    """Return fraction of corridor keywords shared between two texts."""
    t1 = set(_tokenize(text1)) & CORRIDOR_KEYWORDS
    t2 = set(_tokenize(text2)) & CORRIDOR_KEYWORDS
    if not t1 or not t2:
        return 0.0
    return len(t1 & t2) / max(len(t1), len(t2))


def _base_corridor_text(title: str) -> str:
    """Strip reach/phase/part numbers to get the common corridor base."""
    text = title
    for pat in CORRIDOR_PATTERNS:
        text = pat.sub("", text)
    # Remove trailing punctuation/spaces
    text = re.sub(r"[\s:,\-]+$", "", text.strip())
    return text


def _pairwise_similarity(p1: dict, p2: dict) -> float:
    """
    Compute combined corridor similarity between two project dicts.
    Uses semantic similarity + corridor keyword boost.
    """
    text1 = f"{p1.get('title', '')}. {p1.get('description', '')} {p1.get('location_text', '')}"
    text2 = f"{p2.get('title', '')}. {p2.get('description', '')} {p2.get('location_text', '')}"

    sem_sim = compute_semantic_similarity(text1, text2)
    kw_overlap = _corridor_keyword_overlap(text1, text2)

    # Boost similarity if both have corridor patterns
    if _has_corridor_pattern(text1) and _has_corridor_pattern(text2):
        # Boost by up to 0.15 based on keyword overlap
        sem_sim = min(1.0, sem_sim + 0.15 * kw_overlap)

    return round(sem_sim, 3)


def _overlapping_corridor_tokens(projects: list[dict]) -> list[str]:
    """Extract tokens shared across all project texts."""
    if not projects:
        return []
    sets = []
    for p in projects:
        text = f"{p.get('title', '')} {p.get('description', '')} {p.get('location_text', '')}"
        sets.append(_extract_keywords(text) & CORRIDOR_KEYWORDS)
    common = sets[0]
    for s in sets[1:]:
        common = common & s
    return sorted(common)


def _unified_tender_title(projects: list[dict]) -> str:
    """Generate a unified tender title from cluster member projects."""
    if not projects:
        return "Unified Tender Package"
    # Use the base corridor name from the first project
    base = _base_corridor_text(projects[0].get("title", "Work"))
    total = sum(p.get("sanctioned_amount_inr") or 0 for p in projects)
    inr_str = f"₹{total / 1_00_000:.1f} Lakh" if total else ""
    if inr_str:
        return f"Unified E-Tender: {base} (Consolidated {inr_str})"
    return f"Unified E-Tender: {base}"


def detect_split_work_clusters(
    projects: list[dict],
) -> list[dict]:
    """
    Analyse a list of project dicts and identify clusters where artificial
    work-splitting has been used to circumvent the e-tender threshold.

    Each project dict must have:
        project_id, title, description, category, constituency,
        sanctioned_amount_inr, lat, lon, location_text, mandatory_tender

    Returns a list of cluster dicts:
        {
            cluster_id, corridor_name, category, constituency,
            member_projects,
            individual_threshold_inr, total_aggregated_cost_inr,
            nlp_corridor_similarity,
            overlapping_corridor_tokens,
            mandatory_tender_enforced,
            unified_tender_title,
        }
    """
    if len(projects) < 2:
        return []

    clusters: list[dict] = []
    visited: set[str] = set()

    for i, p1 in enumerate(projects):
        if p1["project_id"] in visited:
            continue

        cluster_members = [p1]

        for j, p2 in enumerate(projects):
            if i == j or p2["project_id"] in visited:
                continue

            # Must be same constituency and category
            if (
                p1.get("constituency") != p2.get("constituency")
                or p1.get("category") != p2.get("category")
            ):
                continue

            # Geographic proximity check
            lat1, lon1 = p1.get("lat"), p1.get("lon")
            lat2, lon2 = p2.get("lat"), p2.get("lon")
            if lat1 is not None and lon1 is not None and lat2 is not None and lon2 is not None:
                dist_km = _haversine_km(lat1, lon1, lat2, lon2)
                if dist_km > GEO_PROXIMITY_KM:
                    continue

            # Semantic / corridor similarity
            sim = _pairwise_similarity(p1, p2)
            if sim < SEMANTIC_SIMILARITY_THRESHOLD:
                # Fallback: if both have corridor patterns with same base text, include
                if not (
                    _has_corridor_pattern(p1.get("title", ""))
                    and _has_corridor_pattern(p2.get("title", ""))
                ):
                    continue

            cluster_members.append(p2)

        if len(cluster_members) < 2:
            continue

        # Procurement threshold check
        all_costs = [m.get("sanctioned_amount_inr") or 0 for m in cluster_members]
        total_cost = sum(all_costs)
        all_below_ceiling = all(c <= TENDER_DIRECT_QUOTATION_CEILING for c in all_costs)

        # Must be: each below ₹5L AND total >= ₹10L
        if not (all_below_ceiling and total_cost >= TENDER_MANDATORY_THRESHOLD):
            continue

        # Compute cluster-level similarity (average of pairwise)
        similarities = []
        for a in range(len(cluster_members)):
            for b in range(a + 1, len(cluster_members)):
                similarities.append(_pairwise_similarity(cluster_members[a], cluster_members[b]))
        avg_similarity = round(sum(similarities) / max(len(similarities), 1), 3)

        overlapping_tokens = _overlapping_corridor_tokens(cluster_members)
        unified_title = _unified_tender_title(cluster_members)
        corridor_name = _base_corridor_text(cluster_members[0].get("title", "Road Corridor"))

        cluster = {
            "cluster_id": f"CLUSTER-{str(uuid.uuid4())[:8].upper()}",
            "corridor_name": corridor_name,
            "category": p1.get("category", ""),
            "constituency": p1.get("constituency", ""),
            "member_projects": cluster_members,
            "individual_threshold_inr": TENDER_DIRECT_QUOTATION_CEILING,
            "total_aggregated_cost_inr": total_cost,
            "nlp_corridor_similarity": avg_similarity,
            "overlapping_corridor_tokens": overlapping_tokens,
            "mandatory_tender_enforced": all(m.get("mandatory_tender", False) for m in cluster_members),
            "unified_tender_title": unified_title,
        }

        for m in cluster_members:
            visited.add(m["project_id"])

        clusters.append(cluster)

    return clusters
