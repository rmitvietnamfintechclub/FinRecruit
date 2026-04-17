export type DashboardStatus = 'Pending' | 'Pass' | 'Fail';

type PatchJson = {
  success: boolean;
  message?: string;
  requiresConfirmation?: boolean;
  reroutePreview?: { targetDepartment: string; resultingStatus: string };
};

/**
 * PATCH /api/head-dashboard/candidates/:id/status — dùng chung bảng + modal.
 * Trả về true nếu cập nhật thành công (gọi onSuccess / refresh list ở nơi gọi).
 */
export async function patchCandidateStatus(
  candidateId: string,
  status: DashboardStatus
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(
    `/api/head-dashboard/candidates/${candidateId}/status`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }
  );
  const json = (await res.json()) as PatchJson;

  if (res.status === 409 && json.requiresConfirmation && status === 'Fail') {
    const ok = window.confirm(
      `${json.message ?? 'Xác nhận chuyển thí sinh sang phòng ban choice 2?'}\n\n` +
        (json.reroutePreview
          ? `Phòng đích: ${json.reroutePreview.targetDepartment} → trạng thái: ${json.reroutePreview.resultingStatus}`
          : '')
    );
    if (!ok) {
      return { ok: false, message: 'Đã hủy.' };
    }
    const res2 = await fetch(
      `/api/head-dashboard/candidates/${candidateId}/status`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Fail', confirmReroute: true }),
      }
    );
    const json2 = (await res2.json()) as PatchJson;
    if (!res2.ok) {
      return { ok: false, message: json2.message ?? `Lỗi ${res2.status}` };
    }
    return { ok: true };
  }

  if (!res.ok) {
    return { ok: false, message: json.message ?? `Lỗi ${res.status}` };
  }

  return { ok: true };
}
