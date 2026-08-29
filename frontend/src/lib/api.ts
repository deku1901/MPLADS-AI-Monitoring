/**
 * Typed API client for the MPLADS AI Monitoring Platform backend.
 * Base URL: http://localhost:8000
 *
 * All functions map directly to validated FastAPI endpoints.
 * Do not add fields or endpoints beyond what the backend exposes.
 */

import type {
  ProjectDetail,
  PaymentSubmitResponse,
  CaseDetail,
  CaseSummary,
  NotificationSummary,
  AuditEventSummary,
  EvidenceSubmitResponse,
  SeedResetResponse,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch {
      // ignore parse errors
    }
    throw new Error(detail);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function getProject(projectId: string): Promise<ProjectDetail> {
  return request<ProjectDetail>(`/api/projects/${projectId}`);
}

export async function getProjectAudit(
  projectId: string
): Promise<AuditEventSummary[]> {
  return request<AuditEventSummary[]>(`/api/projects/${projectId}/audit`);
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function submitPayment(params: {
  project_id: string;
  requested_amount_inr: number;
  submitted_by?: string;
  trigger_demo_scenario?: boolean;
  /** Optional evidence photo — required for the demo to trigger photo_duplicate=True and push risk >= 70 */
  image?: File;
}): Promise<PaymentSubmitResponse> {
  // Backend expects multipart/form-data (FastAPI Form() params), not JSON.
  const form = new FormData();
  form.append("project_id", params.project_id);
  form.append("requested_amount_inr", String(params.requested_amount_inr));
  form.append("submitted_by", params.submitted_by ?? "DRDA-IA");
  form.append("trigger_demo_scenario", String(params.trigger_demo_scenario ?? false));
  if (params.image) {
    // Field name must match the FastAPI UploadFile param name exactly: `image`
    form.append("image", params.image, params.image.name);
  }

  const res = await fetch(`${BASE_URL}/api/payments`, {
    method: "POST",
    body: form,
    // Do NOT set Content-Type — browser adds the multipart boundary automatically
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  return res.json() as Promise<PaymentSubmitResponse>;
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

export async function listCases(filters?: {
  status?: string;
  assigned_tier?: string;
  project_id?: string;
}): Promise<CaseSummary[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.assigned_tier) params.set("assigned_tier", filters.assigned_tier);
  if (filters?.project_id) params.set("project_id", filters.project_id);
  const qs = params.toString();
  return request<CaseSummary[]>(`/api/cases${qs ? `?${qs}` : ""}`);
}

export async function getCase(caseId: string): Promise<CaseDetail> {
  return request<CaseDetail>(`/api/cases/${caseId}`);
}

export async function submitEvidence(
  caseId: string,
  params: {
    submitted_by?: string;
    submitted_role?: string;
    content_type?: string;
    content_text?: string;
    justification_reduces_duplicate?: boolean;
    image?: File;
  }
): Promise<EvidenceSubmitResponse> {
  // Evidence endpoint accepts form data, but also falls back to JSON via payload param.
  // We use form-data to match the primary path.
  const form = new FormData();
  if (params.submitted_by) form.append("submitted_by", params.submitted_by);
  if (params.submitted_role) form.append("submitted_role", params.submitted_role);
  if (params.content_type) form.append("content_type", params.content_type);
  if (params.content_text) form.append("content_text", params.content_text);
  form.append(
    "justification_reduces_duplicate",
    String(params.justification_reduces_duplicate ?? true)
  );
  if (params.image) {
    form.append("image", params.image, params.image.name);
  }

  const res = await fetch(`${BASE_URL}/api/cases/${caseId}/evidence`, {
    method: "POST",
    body: form,
    // Don't set Content-Type — browser sets it automatically with boundary for FormData
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body?.detail ?? detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  return res.json() as Promise<EvidenceSubmitResponse>;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function getNotifications(filters?: {
  recipient_role?: string;
  recipient_id?: string;
  unread_only?: boolean;
}): Promise<NotificationSummary[]> {
  const params = new URLSearchParams();
  if (filters?.recipient_role) params.set("recipient_role", filters.recipient_role);
  if (filters?.recipient_id) params.set("recipient_id", filters.recipient_id);
  if (filters?.unread_only) params.set("unread_only", "true");
  const qs = params.toString();
  return request<NotificationSummary[]>(`/api/notifications${qs ? `?${qs}` : ""}`);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await fetch(`${BASE_URL}/api/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

// ---------------------------------------------------------------------------
// Seed / Demo Control
// ---------------------------------------------------------------------------

export async function resetDemoSeed(): Promise<SeedResetResponse> {
  return request<SeedResetResponse>("/api/seed/reset", { method: "POST" });
}

export async function getHealth(): Promise<{ status: string }> {
  return request<{ status: string }>("/api/health");
}
