'use client';

import React from 'react';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import type { DashboardStatus, ReroutePreview } from '@/app/(frontend)/(router)/HeadDashboard/patchCandidateStatus';

type HeadDashboardDialogsProps = {
  // 1. Status Change Dialog
  confirmAction: { id: string; name: string; newStatus: DashboardStatus } | null;
  onCloseStatus: () => void;
  onConfirmStatus: () => void;
  isPatching: boolean;

  // 2. Reroute Dialog
  rerouteConfirm: { id: string; name: string; message: string; preview?: ReroutePreview } | null;
  onCloseReroute: () => void;
  onConfirmReroute: () => void;

  // 3. Round 2 Lock Dialog
  round2ConfirmAction: 'lock' | 'unlock' | null;
  onCloseRound2: () => void;
  onConfirmRound2: () => void;
  isLockingRound2: boolean;
};

export function HeadDashboardDialogs({
  confirmAction,
  onCloseStatus,
  onConfirmStatus,
  isPatching,
  rerouteConfirm,
  onCloseReroute,
  onConfirmReroute,
  round2ConfirmAction,
  onCloseRound2,
  onConfirmRound2,
  isLockingRound2,
}: HeadDashboardDialogsProps) {
  return (
    <>
      {/* 1. STATUS CHANGE DIALOG */}
      <ConfirmDialog
        open={confirmAction !== null}
        title="Update Candidate Status"
        variant={confirmAction?.newStatus === 'Fail' ? 'destructive' : 'default'}
        description={
          confirmAction ? (
            <>
              Are you sure you want to mark{' '}
              <span className="font-bold text-gray-900">{confirmAction.name}</span> as{' '}
              <span
                className={
                  confirmAction.newStatus === 'Pass'
                    ? 'font-bold text-emerald-600'
                    : confirmAction.newStatus === 'Pending'
                      ? 'font-bold text-[#A28436]'
                      : 'font-bold text-[#B82649]'
                }
              >
                {confirmAction.newStatus}
              </span>
              ? This will update their current standing in the recruitment process.
            </>
          ) : (
            ''
          )
        }
        confirmLabel={`Mark as ${confirmAction?.newStatus || ''}`}
        onConfirm={onConfirmStatus}
        onCancel={onCloseStatus}
        loading={isPatching}
      />

      {/* 2. REROUTE (2ND CHOICE) DIALOG */}
      <ConfirmDialog
        open={rerouteConfirm !== null}
        title="Forward to 2nd Choice"
        variant="destructive"
        description={
          rerouteConfirm ? (
            <div className="flex flex-col gap-4">
              <p className="text-gray-600">{rerouteConfirm.message}</p>
              
              {/* Khối Preview thông tin */}
              {rerouteConfirm.preview ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-xs text-gray-600">
                  <div className="mb-2 flex items-center justify-between">
                    <span>Forwarding to:</span>
                    <span className="font-black uppercase tracking-wider text-gray-900">
                      {rerouteConfirm.preview.targetDepartment}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Initial status:</span>
                    <span className="font-bold text-[#A28436]">
                      {rerouteConfirm.preview.resultingStatus}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Khối Cảnh báo không thể hoàn tác (Mới thêm) */}
              <div className="rounded-lg border border-[#B82649]/20 bg-[#B82649]/5 p-3 text-xs font-semibold text-[#B82649]">
                <i className="fa-solid fa-triangle-exclamation mr-1.5" />
                This action cannot be undone. The candidate will be permanently removed from your evaluation list.
              </div>
            </div>
          ) : (
            ''
          )
        }
        confirmLabel="Yes, Forward Candidate"
        onConfirm={onConfirmReroute}
        onCancel={onCloseReroute}
        loading={isPatching}
      />

      {/* 3. ROUND 2 LOCK/UNLOCK DIALOG */}
      <ConfirmDialog
        open={round2ConfirmAction !== null}
        title={round2ConfirmAction === 'unlock' ? 'Unlock Round 2?' : 'Finalize Round 2?'}
        variant={round2ConfirmAction === 'unlock' ? 'default' : 'destructive'}
        description={
          round2ConfirmAction === 'unlock'
            ? 'Unlocking will allow you to modify candidate evaluation results again.'
            : 'Locking will finalize all Round 2 results. Make sure all interviews are properly evaluated before proceeding.'
        }
        confirmLabel={round2ConfirmAction === 'unlock' ? 'Yes, Unlock' : 'Yes, Lock Round 2'}
        onConfirm={onConfirmRound2}
        onCancel={onCloseRound2}
        loading={isLockingRound2}
      />
    </>
  );
}