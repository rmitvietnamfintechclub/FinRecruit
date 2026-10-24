'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { DepartmentType } from '@/app/(backend)/types';
import type { DepartmentState, LockRound1Result } from '@/types/roundTransition';
import { getRoundTransitionApi } from '@/lib/round-transition/api';

// ==========================================
// 1. LIGHTWEIGHT GLOBAL STORE (Thay thế mock-store)
// ==========================================
let globalStates: DepartmentState[] = [];
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => globalStates;
const getServerSnapshot = () => globalStates;

// Hàm cập nhật toàn bộ state (khi lấy từ API)
const setGlobalStates = (newStates: DepartmentState[]) => {
  globalStates = newStates;
  listeners.forEach((notify) => notify());
};

// Hàm cập nhật cục bộ ngay lập tức để UI phản hồi không độ trễ khi ấn Lock
const updateLocalDepartmentLock = (department: string) => {
  globalStates = globalStates.map((state) =>
    state.department === department ? { ...state, isRound1Locked: true } : state
  );
  listeners.forEach((notify) => notify());
};


// ==========================================
// 2. HOOKS
// ==========================================

export function useDepartmentStates(): DepartmentState[] {
  // Lấy state từ Global Store
  const states = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    let active = true;

    const fetchRealStates = async () => {
      try {
        const data = (await getRoundTransitionApi().getDepartmentStates()) as
          | DepartmentState[]
          | { departments?: DepartmentState[] };

        // Trích xuất đúng mảng departments từ response của API GET
        const nextStates = Array.isArray(data)
          ? data
          : Array.isArray(data?.departments)
            ? data.departments
            : [];

        if (active && nextStates.length > 0) {
          setGlobalStates(nextStates);
        }
      } catch (e) {
        console.error('Failed to sync real department states:', e);
      }
    };

    // Gọi API lần đầu tiên
    fetchRealStates();

    // Tự động đồng bộ với Database mỗi 15 giây (đề phòng Admin khác thay đổi)
    const interval = setInterval(fetchRealStates, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return states;
}

export function useLockRound1() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lock = useCallback(
    async (department: DepartmentType): Promise<LockRound1Result> => {
      setPending(true);
      setError(null);
      
      try {
        const result = await getRoundTransitionApi().lockRound1(department);
        
        if (!result.success) {
          setError(result.message ?? 'Failed to lock Round 1.');
        } else {
          // Cập nhật Store toàn cục ngay lập tức để MasterCandidatesPage nhảy trạng thái ngay
          updateLocalDepartmentLock(department);
        }
        
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : 'An unexpected error occurred.';
        setError(message);
        return { success: false, message };
      } finally {
        setPending(false);
      }
    },
    []
  );

  return { lock, pending, error };
}