# MPLADS AI Monitoring — Engineering Roadmap & Slices

This document maintains the canonical track of all Vertical Slices and Features (F1–F14) built for the MoSPI MPLADS AI Monitoring & Autonomous Intervention System.

---

## 🗺️ Completed Vertical Slices & Roadmap Features

| Feature ID | Vertical Slice | Module Name | AI / Technical Engine | Intervention & Output | Test Suite |
|---|---|---|---|---|---|
| **F1** | Slice 1 | Autonomous Fund Lock & Payment Firebreak | Real-time perceptual hashing (`pHash`) + Unified Risk Recalculation | Payment hold in simulated PFMS escrow, Case creation (`CASE-1042`), DA review workflow | `tests/test_slice1_api.py` |
| **F2** | Slice 2 | Recommendation Pre-Sanction Screening | Sentence Transformers (`all-MiniLM-L6-v2`) NLP Cosine Similarity | Duplicate proposal warning (`REJECTION_WARNING` / `PROCEED_TO_SANCTION`) | `tests/test_slice2_api.py` |
| **F3** | Slice 3 | Citizen Ground-Truth Verification ("Ye Thik Karke Dikhao") | Multi-factor weighted credibility scoring (GPS proximity, photo validation, consistency) | Negative report accumulation triggers status `INSPECTION_REQUIRED` & DA case (`CASE-1035`) | `tests/test_slice3_api.py` |
| **F4** | Slice 4 | Split-Work Anomaly Detection & Unified Tender Enforcement | Token clustering + Geographic proximity & corridor radius matching | Threshold bypassing bypass blocked; mandatory unified e-tendering enforced (`CASE-SPLIT-1051`) | `tests/test_slice4_api.py` |
| **F11** | Slice 5 | Satellite Change Detection & Remote Sensing Verification | Computer Vision progress estimation + Optical satellite change tracking | Progress mismatch detection (e.g. 31% physical vs 80% reported); triggers `CASE-SAT-1042` | `tests/test_slice5_api.py` |
| **F12** | Slice 5B | Project Delay & Stalled Work Detection Engine | Timeline duration analysis + Linear progress model + Statutory SLA thresholding | Identifies stalled works (>90 days without progress) or severe timeline gaps; triggers `CASE-DELAY-1042` | `tests/test_slice5b_api.py` |
| **F13** | Slice 6 | Financial & Expenditure Analytics Engine | Cost variance analytics + Fund utilization rate + Expenditure-to-progress ratio | Fiscal front-loading & abnormal cost escalations (>25%) detected; triggers `CASE-FIN-1042` | `tests/test_slice6_api.py` |
| **F14** | Slice 7 | Cost Overrun Detection & Budget Trajectory Engine | Multi-tier budget trajectory comparison (Original vs Revised vs Incurred) | Detects estimate escalations (>25% configurable threshold) and budget exhaustion; triggers `CASE-COST-1042` | `tests/test_slice7_api.py` |
| **F15** | Slice 8 | Unified AI Analytics & Portfolio Decision Dashboard | Cross-module synthesis & telemetry aggregation across all 8 detection channels (F1–F14) | Centralized executive command center: risk distribution, authority workload, module health matrix, active interventions | `tests/test_slice8_api.py` |
| **F16** | Slice 9 | Autonomous Accountability Clock & Multi-Tier Escalation Engine | Real-time statutory SLA countdown timers + Multi-tier authority ladder (DA → SNA → MoSPI) | Dynamic SLA countdown, automated tier advancement, interactive non-response simulation & evidence resolution | `tests/test_slice9_api.py` |


---

## 🏛️ Architecture Overview

The system follows a continuous closed-loop monitoring pattern across the MPLADS lifecycle:
**SENSE ➔ THINK ➔ ACT ➔ VERIFY ➔ ESCALATE**

1. **Sense**: Ingests project data, sanction orders, geospatial coordinates, payment submissions, milestone photos, and citizen feedback.
2. **Think**: Evaluates evidence using specialized AI modules (NLP embeddings, CV perceptual hashing, remote sensing, and statistical fiscal models) into a unified 0–100 risk score.
3. **Act**: Replaces passive dashboards with active interventions (escrow payment holds, mandatory tender enforcement, DA inquiry cases, automated email/in-app nudges).
4. **Verify**: Accepts evidence and official responses from authorities, re-evaluates risk dynamically, and resolves or de-escalates cases.
5. **Escalate**: Enforces statutory accountability windows with automated reminders and escalation to State Nodal Authorities (SNA) and MoSPI headquarters.
