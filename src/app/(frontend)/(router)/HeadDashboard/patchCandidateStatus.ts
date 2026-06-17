export type DashboardStatus = 'Pending' | 'Pass' | 'Fail';

export type ReroutePreview = {
  targetDepartment: string;
  resultingStatus: string;
};

type PatchJson = {
  success: boolean;
  message?: string;
  requiresConfirmation?: boolean;
  reroutePreview?: ReroutePreview;
};

export type PatchResult =
  | { ok: true }
  | { ok: false; message?: string }
  | {
      ok: false;
      needsRerouteConfirm: true;
      message: string;
      reroutePreview?: ReroutePreview;
    };

/**
 * PATCH /api/head-dashboard/candidates/:id/status — shared by table + modal.
 * Returns ok: true on success (caller refreshes list).
 */
export async function patchCandidateStatus(
  candidateId: string,
  status: DashboardStatus,
  options?: { confirmReroute?: boolean }
): Promise<PatchResult> {
  const res = await fetch(
    `/api/head-dashboard/candidates/${candidateId}/status`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        ...(options?.confirmReroute ? { confirmReroute: true } : {}),
      }),
    }
  );
  const json = (await res.json()) as PatchJson;

  if (
    res.status === 409 &&
    json.requiresConfirmation &&
    status === 'Fail' &&
    !options?.confirmReroute
  ) {
    return {
      ok: false,
      needsRerouteConfirm: true,
      message:
        json.message ??
        'Mark as Fail and send this candidate to their second-choice department for review?',
      reroutePreview: json.reroutePreview,
    };
  }

  if (!res.ok) {
    return { ok: false, message: json.message ?? `Error ${res.status}` };
  }

  return { ok: true };
}
