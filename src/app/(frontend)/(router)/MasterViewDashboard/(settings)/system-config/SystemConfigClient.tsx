'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AppNotice } from '@/components/feedback/AppNotice';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { cn } from '@/lib/utils';
import { useSessionExpired } from '@/components/providers/SessionExpiredProvider';

// --- TYPES ---
type ActiveConfig = {
  currentGeneration: string;
  currentSemester: string;
  isRecruitmentActive: boolean;
};

type Generation = {
  id: string;
  name: string;
  semesters: Array<{ code: string }>;
};

type Payload = {
  success?: boolean;
  active?: ActiveConfig;
  generations?: Generation[];
  generation?: Generation;
  message?: string;
};

function isActiveSemester(
  active: ActiveConfig | null,
  generationName: string,
  semesterCode: string
) {
  if (!active) return false;
  return (
    active.currentGeneration === generationName &&
    active.currentSemester.toLowerCase() === semesterCode.toLowerCase()
  );
}

// --- MAIN COMPONENT ---
export function SystemConfigClient() {
  const [active, setActive] = useState<ActiveConfig | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Smart Create Gen State
  const [showSmartCreate, setShowSmartCreate] = useState(false);
  const [smartGenName, setSmartGenName] = useState('');
  const [smartGenYear, setSmartGenYear] = useState('');

  // Delete State (Đã gỡ bỏ state edit)
  const [deleteGenTarget, setDeleteGenTarget] = useState<Generation | null>(
    null
  );

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activateConfirm, setActivateConfirm] = useState<{
    generation: string;
    semester: string;
  } | null>(null);

  const { triggerSessionExpired } = useSessionExpired();

  const showSuccessNotice = useCallback((msg: string) => {
    setSuccess(msg);
    window.setTimeout(() => setSuccess(null), 4000);
  }, []);

  // --- CENTRALIZED API WRAPPER ---
  const fetchApi = useCallback(
    async (url: string, options?: RequestInit): Promise<Payload | null> => {
      const res = await fetch(url, { ...options, credentials: 'include' });

      if (res.redirected && res.url.toLowerCase().includes('login')) {
        triggerSessionExpired();
        return null;
      }

      const json = (await res.json()) as Payload;

      if (!res.ok || !json.success) {
        const msg = json.message || `Error ${res.status}`;
        if (
          msg.toLowerCase().includes('authentication required') ||
          msg.includes('401')
        ) {
          triggerSessionExpired();
          return null;
        }
        throw new Error(msg);
      }
      return json;
    },
    [triggerSessionExpired]
  );

  // --- ACTIONS ---
  const load = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      setError(null);
      try {
        const json = await fetchApi('/api/executive/system-config');
        if (!json) return;

        setActive(json.active ?? null);
        const gens = json.generations ?? [];
        setGenerations(gens);

        if (!isSilent) {
          const activeGen = gens.find(
            (g) => g.name === json.active?.currentGeneration
          );
          setExpandedIds(
            new Set(activeGen ? [activeGen.id] : gens[0] ? [gens[0].id] : [])
          );
        }
      } catch (e) {
        if (!isSilent)
          setError(e instanceof Error ? e.message : 'Load failed.');
      } finally {
        if (!isSilent) setLoading(false);
      }
    },
    [fetchApi]
  );

  // Polling ngầm chuẩn xác bằng setInterval độc lập (Cứ 8 giây đồng bộ 1 lần)
  useEffect(() => {
    void load(false);
    const interval = setInterval(() => {
      void load(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [load]);

  const handleToggleSmartCreate = () => {
    if (!showSmartCreate) {
      let maxGen = 7;
      let maxYear = 2026;

      generations.forEach((g) => {
        const genNumMatch = g.name.match(/\d+/);
        if (genNumMatch) {
          const num = parseInt(genNumMatch[0], 10);
          if (num > maxGen) maxGen = num;
        }
        g.semesters.forEach((s) => {
          const yearMatch = s.code.match(/\d{4}/);
          if (yearMatch) {
            const yearNum = parseInt(yearMatch[0], 10);
            if (yearNum > maxYear) maxYear = yearNum;
          }
        });
      });

      setSmartGenName(`Gen ${maxGen + 1}`);
      setSmartGenYear((maxYear + 1).toString());
    }
    setShowSmartCreate(!showSmartCreate);
  };

  // SMART CREATE (Đã tối ưu chạy song song Promise.all giúp không bị đơ giao diện)
  const executeSmartCreate = async () => {
    const name = smartGenName.trim();
    const year = smartGenYear.trim();
    if (!name || !year) return;

    setBusy(true);
    setError(null);
    try {
      const json = await fetchApi('/api/executive/system-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-generation', name }),
      });
      if (!json) return;

      const createdGenId = json.generation?.id;

      if (createdGenId) {
        const sems = [`${year}A`, `${year}B`, `${year}C`];
        await Promise.all(
          sems.map((code) =>
            fetchApi(
              `/api/executive/system-config/generations/${createdGenId}/semesters`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
              }
            )
          )
        );

        showSuccessNotice(
          `Successfully initialized ${name} with semesters ${sems.join(', ')}`
        );
        setShowSmartCreate(false);
        await load(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Smart creation failed.');
    } finally {
      setBusy(false);
    }
  };

  // DELETE GENERATION (Có bảo vệ không cho xóa Gen đang chứa Active Semester)
  const handleDeleteGeneration = async () => {
    if (!deleteGenTarget) return;

    const hasActiveSem = deleteGenTarget.semesters.some((s) =>
      isActiveSemester(active, deleteGenTarget.name, s.code)
    );

    if (hasActiveSem) {
      setError(
        `Cannot delete "${deleteGenTarget.name}" because it contains the currently active semester.`
      );
      setDeleteGenTarget(null);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/executive/system-config/generations/${deleteGenTarget.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || 'Failed to delete generation.');
      }
      showSuccessNotice(`Deleted generation "${deleteGenTarget.name}"`);
      setDeleteGenTarget(null);
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    } finally {
      setBusy(false);
    }
  };

  const requestActivateCohort = (generation: string, semester: string) => {
    setActivateConfirm({ generation, semester });
  };

  const confirmActivateCohort = async () => {
    if (!activateConfirm) return;
    const { generation, semester } = activateConfirm;
    setActivateConfirm(null);
    setBusy(true);
    setError(null);
    try {
      const json = await fetchApi('/api/executive/system-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate', generation, semester }),
      });
      if (!json) return;
      showSuccessNotice(`Active period set to ${generation} / ${semester}`);
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Activation failed.');
    } finally {
      setBusy(false);
    }
  };

  const patchRecruitment = async (isRecruitmentActive: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const json = await fetchApi('/api/executive/system-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRecruitmentActive }),
      });
      if (!json) return;
      setActive(json.active ?? null);
      showSuccessNotice(
        isRecruitmentActive
          ? 'Recruitment form is now OPEN'
          : 'Recruitment form is now CLOSED'
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Status update failed.');
    } finally {
      setBusy(false);
    }
  };

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const recruitmentOn = Boolean(active?.isRecruitmentActive);
  const totalSemesters = useMemo(
    () => generations.reduce((n, g) => n + g.semesters.length, 0),
    [generations]
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 my-4">
      {(error || success) && (
        <div className="space-y-2">
          {error && (
            <AppNotice variant="error" onDismiss={() => setError(null)}>
              {error}
            </AppNotice>
          )}
          {success && (
            <AppNotice variant="success" onDismiss={() => setSuccess(null)}>
              {success}
            </AppNotice>
          )}
        </div>
      )}

      {/* 2. HERO: ACTIVE CYCLE */}
      <div className="relative overflow-hidden rounded-[24px] border border-gray-200 bg-white p-8 shadow-sm">
        <div className="absolute -right-20 -top-20 z-0 h-64 w-64 rounded-full bg-linear-to-br from-[#DCB968]/20 to-[#0D1742]/5 opacity-50 blur-3xl"></div>
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFEFCA] text-[#A28436] shadow-sm">
              <i className="fa-solid fa-bullseye text-2xl" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#A28436]">
                Active Period
              </p>
              <h3 className="text-3xl font-black text-[#0D1742] mt-1">
                {loading ? (
                  <span className="opacity-50">Loading...</span>
                ) : (
                  <>
                    {active?.currentGeneration || '—'}{' '}
                    <span className="text-[#5E5E92] font-medium mx-1">/</span>{' '}
                    {active?.currentSemester || '—'}
                  </>
                )}
              </h3>
              <p className="text-sm font-medium text-[#5E5E92] mt-1">
                New form submissions and role assignments are mapped to this
                period.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl bg-gray-50 p-5 border border-gray-100">
            <div className="sm:text-right">
              <p className="text-sm font-bold text-[#0D1742]">
                Recruitment Form
              </p>
              <p
                className={cn(
                  'text-xs font-semibold mt-0.5',
                  recruitmentOn ? 'text-emerald-600' : 'text-red-600'
                )}
              >
                {recruitmentOn ? 'Accepting Responses' : 'Form Closed'}
              </p>
            </div>
            <Switch
              checked={recruitmentOn}
              disabled={loading || busy}
              onCheckedChange={(v) => void patchRecruitment(v)}
              className="data-[state=checked]:bg-emerald-500 shrink-0 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* 3. GENERATIONS DIRECTORY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-black tracking-tight text-[#0D1742]">
              Generations Directory
            </h3>
            <Badge
              variant="secondary"
              className="bg-gray-100 text-gray-600 font-semibold"
            >
              {generations.length}{' '}
              {generations.length === 1 ? 'Generation' : 'Generations'} •{' '}
              {totalSemesters} {totalSemesters === 1 ? 'Semester' : 'Semesters'}
            </Badge>
          </div>
          <Button
            variant={showSmartCreate ? 'outline' : 'default'}
            size="sm"
            className={cn(
              'rounded-xl text-xs font-bold transition-all',
              !showSmartCreate &&
                'bg-[#0D1742] text-[#DCB968] hover:bg-[#0D1742]/90'
            )}
            onClick={handleToggleSmartCreate}
          >
            <i
              className={cn(
                'fa-solid mr-2',
                showSmartCreate ? 'fa-xmark' : 'fa-wand-magic-sparkles'
              )}
            />
            {showSmartCreate ? 'Cancel' : 'Quick Add'}
          </Button>
        </div>

        {/* SMART SETUP FORM */}
        {showSmartCreate && (
          <div className="animate-in slide-in-from-top-4 fade-in duration-300 rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
            <h4 className="text-sm font-black uppercase tracking-wider text-[#0D1742] mb-4">
              Quick Setup
            </h4>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-bold text-[#5E5E92]">
                  Generation Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Gen 8"
                  value={smartGenName}
                  onChange={(e) => setSmartGenName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#0D1742] shadow-sm focus:border-[#0D1742] focus:outline-none focus:ring-1 focus:ring-[#0D1742]"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-bold text-[#5E5E92]">
                  Academic Year
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2027"
                  value={smartGenYear}
                  onChange={(e) => setSmartGenYear(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#0D1742] shadow-sm focus:border-[#0D1742] focus:outline-none focus:ring-1 focus:ring-[#0D1742]"
                />
              </div>
              <div className="flex items-end">
                <Button
                  disabled={
                    busy || !smartGenName.trim() || !smartGenYear.trim()
                  }
                  onClick={() => void executeSmartCreate()}
                  className="h-10.5 w-full sm:w-auto rounded-xl bg-[#0D1742] text-[#DCB968] hover:bg-[#0D1742]/90 font-bold shadow-sm"
                >
                  {busy ? (
                    <i className="fa-solid fa-spinner fa-spin mr-2" />
                  ) : (
                    <i className="fa-solid fa-bolt mr-2" />
                  )}
                  Create Generation
                </Button>
              </div>
            </div>
            <p className="text-xs font-medium text-[#5E5E92] mt-4 bg-white/60 py-2 px-3 rounded-lg border border-gray-100 inline-flex items-center">
              <i className="fa-solid fa-circle-info text-[#DCB968] mr-2" />
              Automatically creates standard semesters:{' '}
              <strong className="mx-1 text-[#0D1742]">
                {smartGenYear || 'YYYY'}A, {smartGenYear || 'YYYY'}B,{' '}
                {smartGenYear || 'YYYY'}C
              </strong>{' '}
            </p>
          </div>
        )}

        {/* LIST */}
        {loading && generations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-16 shadow-sm">
            <i className="fa-solid fa-spinner fa-spin text-3xl text-gray-300" />
            <p className="mt-3 text-sm font-bold text-gray-400">
              Loading generations...
            </p>
          </div>
        ) : generations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-16 text-center">
            <i className="fa-solid fa-layer-group text-4xl text-gray-300 mb-4" />
            <p className="text-base font-bold text-[#0D1742]">
              No generations created yet
            </p>
            <p className="text-sm text-[#5E5E92] mt-1">
              Use Quick Add to set up your first generation.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {generations.map((g) => {
              const expanded = expandedIds.has(g.id);
              const isActiveGen = active?.currentGeneration === g.name;

              // KIỂM TRA XEM GEN NÀY CÓ CHỨA SEMESTER ĐANG ACTIVE KHÔNG
              const hasActiveSem = g.semesters.some((s) =>
                isActiveSemester(active, g.name, s.code)
              );

              return (
                <div
                  key={g.id}
                  className={cn(
                    'overflow-hidden rounded-2xl border transition-all duration-300',
                    isActiveGen
                      ? 'border-[#0D1742]/20 bg-[#F0EDFF]/30 shadow-sm'
                      : 'border-gray-200 bg-white'
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-gray-50">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-4 text-left"
                      onClick={() => toggleExpanded(g.id)}
                    >
                      <div
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-full transition-all duration-300',
                          expanded
                            ? 'bg-gray-200 text-gray-700 rotate-90'
                            : 'bg-gray-100 text-gray-400'
                        )}
                      >
                        <i className="fa-solid fa-chevron-right text-[10px]" />
                      </div>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-lg font-black text-[#0D1742] truncate">
                          {g.name}
                        </span>
                        {isActiveGen && (
                          <Badge className="bg-emerald-100 text-emerald-700 text-[10px] uppercase tracking-wider hover:bg-emerald-200 border-0 font-bold shadow-none shrink-0">
                            Current
                          </Badge>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-xs font-bold text-[#5E5E92] bg-gray-100 px-3 py-1 rounded-full hidden sm:block">
                        {g.semesters.length}{' '}
                        {g.semesters.length === 1 ? 'Semester' : 'Semesters'}
                      </div>

                      {/* CHỈ HIỂN THỊ NÚT XÓA NẾU KHÔNG CÓ SEMESTER NÀO ĐANG ACTIVE */}
                      {!hasActiveSem && (
                        <div className="flex items-center gap-1 border-l border-gray-200 pl-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteGenTarget(g)}
                            className="size-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete Generation"
                          >
                            <i className="fa-solid fa-trash text-xs" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ACCORDION CONTENT */}
                  {expanded && (
                    <div className="border-t border-gray-100 bg-gray-50/50 px-5 pb-5 pt-4 animate-in slide-in-from-top-2 duration-300">
                      {g.semesters.length === 0 ? (
                        <p className="text-sm font-medium text-gray-500 italic">
                          No semesters added to this generation yet.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {g.semesters.map((s) => {
                            const isLive = isActiveSemester(
                              active,
                              g.name,
                              s.code
                            );
                            return (
                              <div
                                key={s.code}
                                className={cn(
                                  'flex items-center justify-between rounded-xl border p-4 shadow-sm transition-all',
                                  isLive
                                    ? 'border-emerald-200 bg-emerald-50'
                                    : 'border-gray-200 bg-white'
                                )}
                              >
                                <span
                                  className={cn(
                                    'font-bold text-base',
                                    isLive
                                      ? 'text-emerald-900'
                                      : 'text-[#0D1742]'
                                  )}
                                >
                                  {s.code}
                                </span>
                                {isLive ? (
                                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/50 px-2.5 py-1 rounded-md border border-emerald-200 shadow-sm">
                                    <span className="relative flex size-1.5">
                                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500"></span>
                                    </span>
                                    Active
                                  </span>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() =>
                                      requestActivateCohort(g.name, s.code)
                                    }
                                    className="h-8 text-xs font-bold rounded-lg border-gray-200 text-gray-600 hover:text-[#0D1742] hover:bg-gray-100 hover:border-gray-300 transition-all shadow-sm"
                                  >
                                    Activate
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm Dialog Active Cycle */}
      <ConfirmDialog
        open={activateConfirm !== null}
        title="Set Active Period"
        description={
          activateConfirm ? (
            <span className="mt-2 flex flex-col gap-3">
              <span className="block text-sm text-[#5E5E92]">
                Are you sure you want to set{' '}
                <strong className="text-[#0D1742]">
                  {activateConfirm.generation} / {activateConfirm.semester}
                </strong>{' '}
                as the active recruitment period? New form applications and
                role assignments will be mapped to this period. Past records
               remain unchanged.
              </span>
            </span>
          ) : (
            ''
          )
        }
        confirmLabel="Set as Active"
        onConfirm={() => void confirmActivateCohort()}
        onCancel={() => setActivateConfirm(null)}
        loading={busy}
      />

      {/* Confirm Dialog Delete Generation */}
      <ConfirmDialog
        open={deleteGenTarget !== null}
        title="Delete Generation?"
        description={
          deleteGenTarget ? (
            <span className="mt-2 flex flex-col gap-3">
              <span className="block text-sm text-[#5E5E92]">
                You are about to permanently delete{' '}
                <strong className="text-[#0D1742]">
                  {deleteGenTarget.name}
                </strong>
                . This action cannot be undone and will erase all associated
                semesters.
              </span>
            </span>
          ) : (
            ''
          )
        }
        variant="destructive"
        confirmLabel="Delete Generation"
        onConfirm={() => void handleDeleteGeneration()}
        onCancel={() => setDeleteGenTarget(null)}
        loading={busy}
      />
    </div>
  );
}
