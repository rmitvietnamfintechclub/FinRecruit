'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { AppNotice } from '@/components/feedback/AppNotice';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { cn } from '@/lib/utils';

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

const inputClass =
  'border-input bg-background w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600/40';

export function SystemConfigClient() {
  const [active, setActive] = useState<ActiveConfig | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newGenName, setNewGenName] = useState('');
  const [semesterCodes, setSemesterCodes] = useState<Record<string, string>>({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activateConfirm, setActivateConfirm] = useState<{
    generation: string;
    semester: string;
  } | null>(null);

  // Animation hints — short-lived highlight keys flipped on after a successful
  // mutation so the relevant row plays an enter / activate keyframe once.
  const [highlightGenId, setHighlightGenId] = useState<string | null>(null);
  const [highlightSemKey, setHighlightSemKey] = useState<string | null>(null);
  const [highlightActive, setHighlightActive] = useState<string | null>(null);

  const flashHighlight = useCallback(
    (setter: (v: string | null) => void, key: string, durationMs = 1400) => {
      setter(key);
      window.setTimeout(() => setter(null), durationMs);
    },
    []
  );

  const showSuccess = useCallback((msg: string) => {
    setSuccess(msg);
    window.setTimeout(() => setSuccess(null), 3500);
  }, []);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/executive/system-config', {
        credentials: 'include',
      });
      const json = (await res.json()) as Payload;
      if (!res.ok || !json.success) {
        setError(json.message ?? `Failed (${res.status})`);
        return;
      }
      setActive(json.active ?? null);
      const gens = json.generations ?? [];
      setGenerations(gens);

      const activeGen = gens.find(
        (g) => g.name === json.active?.currentGeneration
      );
      setExpandedIds(
        new Set(activeGen ? [activeGen.id] : gens[0] ? [gens[0].id] : [])
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalSemesters = useMemo(
    () => generations.reduce((n, g) => n + g.semesters.length, 0),
    [generations]
  );

  type PostJsonResult =
    | { ok: true; data: Payload }
    | { ok: false; message: string };

  async function postJson(
    body: Record<string, unknown>,
    successMsg: string
  ): Promise<PostJsonResult> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/executive/system-config', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as Payload;
      if (!res.ok || !json.success) {
        const message = json.message ?? `Request failed (${res.status})`;
        setError(message);
        return { ok: false, message };
      }
      showSuccess(successMsg);
      await load();
      return { ok: true, data: json };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Request failed.';
      setError(message);
      return { ok: false, message };
    } finally {
      setBusy(false);
    }
  }

  async function createGeneration(rawName: string) {
    const name = rawName.trim();
    if (!name) return;
    const result = await postJson(
      { action: 'create-generation', name },
      `Created ${name}`
    );
    if (!result.ok) return;
    setNewGenName('');
    const created = (result.data.generations ?? []).find(
      (g) => g.name.toLowerCase() === name.toLowerCase()
    );
    if (created) {
      // Open the new generation card so the highlight is actually visible.
      setExpandedIds((prev) => new Set([...prev, created.id]));
      flashHighlight(setHighlightGenId, created.id);
    }
  }

  function requestActivateCohort(generation: string, semester: string) {
    setActivateConfirm({ generation, semester });
  }

  async function confirmActivateCohort() {
    if (!activateConfirm) return;
    const { generation, semester } = activateConfirm;
    setActivateConfirm(null);
    const result = await postJson(
      { action: 'activate', generation, semester },
      `Activated ${generation} / ${semester}`
    );
    if (result.ok) {
      flashHighlight(
        setHighlightActive,
        `${generation.toLowerCase()}|${semester.toLowerCase()}`,
        1800
      );
    }
  }

  async function patchRecruitment(isRecruitmentActive: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/executive/system-config', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRecruitmentActive }),
      });
      const json = (await res.json()) as Payload;
      if (!res.ok || !json.success) {
        setError(json.message ?? `Update failed (${res.status})`);
        return;
      }
      setActive(json.active ?? null);
      showSuccess(
        isRecruitmentActive
          ? 'Webhook intake enabled'
          : 'Webhook intake disabled'
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setBusy(false);
    }
  }

  async function addSemester(generationId: string, generationName: string) {
    const code = semesterCodes[generationId]?.trim();
    if (!code) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/executive/system-config/generations/${generationId}/semesters`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        }
      );
      const json = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || !json.success) {
        setError(json.message ?? `Failed (${res.status})`);
        return;
      }
      setSemesterCodes((prev) => ({ ...prev, [generationId]: '' }));
      showSuccess(`Added semester ${code} to ${generationName}`);
      await load();
      flashHighlight(
        setHighlightSemKey,
        `${generationId}|${code.toLowerCase()}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add semester.');
    } finally {
      setBusy(false);
    }
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const recruitmentOn = Boolean(active?.isRecruitmentActive);

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes systemConfigRowEnter {
          0% {
            opacity: 0;
            transform: translateY(-6px) scale(0.985);
          }
          60% {
            opacity: 1;
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes systemConfigRowActivate {
          0% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.55);
            transform: scale(1);
          }
          35% {
            box-shadow: 0 0 0 10px rgba(34, 197, 94, 0.18);
            transform: scale(1.012);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
            transform: scale(1);
          }
        }
        @keyframes systemConfigHeroSwap {
          0% {
            opacity: 0;
            transform: translateY(8px);
            filter: blur(2px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
        @keyframes systemConfigBadgePop {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          60% {
            transform: scale(1.05);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .sc-row-enter {
          animation: systemConfigRowEnter 360ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .sc-row-activate {
          animation: systemConfigRowActivate 1500ms ease-out both;
        }
        .sc-hero-swap {
          animation: systemConfigHeroSwap 320ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .sc-badge-pop {
          animation: systemConfigBadgePop 280ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .sc-collapsible {
          display: grid;
          grid-template-rows: 0fr;
          opacity: 0;
          transition:
            grid-template-rows 280ms cubic-bezier(0.16, 1, 0.3, 1),
            opacity 220ms ease;
        }
        .sc-collapsible[data-open='true'] {
          grid-template-rows: 1fr;
          opacity: 1;
        }
        .sc-collapsible > .sc-collapsible-inner {
          overflow: hidden;
          min-height: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .sc-row-enter,
          .sc-row-activate,
          .sc-hero-swap,
          .sc-badge-pop {
            animation: none !important;
          }
          .sc-collapsible {
            transition: none !important;
          }
        }
      `}</style>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground">
            System Config
          </h2>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Manage the Generation → Semester catalog, activate the system cohort, and toggle webhook intake.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={loading || busy}
          onClick={() => void load()}
          className="shrink-0"
        >
          <i className="fa-solid fa-rotate-right mr-2" />
          Refresh
        </Button>
      </div>

      {(error || success) && (
        <div className="space-y-2">
          {error ? (
            <AppNotice variant="error" onDismiss={() => setError(null)}>
              {error}
            </AppNotice>
          ) : null}
          {success ? (
            <AppNotice variant="success" onDismiss={() => setSuccess(null)}>
              {success}
            </AppNotice>
          ) : null}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          className={cn(
            'lg:col-span-2 overflow-hidden border-2',
            recruitmentOn
              ? 'border-green-500/30 bg-linear-to-br from-green-500/5 to-card'
              : 'border-red-500/20 bg-linear-to-br from-red-500/5 to-card'
          )}
        >
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-black">
                  Active cohort
                </CardTitle>
                <CardDescription>
                  Used for webhook intake and new user role grants
                </CardDescription>
              </div>
              <Badge
                variant={recruitmentOn ? 'default' : 'destructive'}
                className={cn(
                  'px-3 py-1 text-xs font-bold',
                  recruitmentOn &&
                    'bg-green-600 text-white hover:bg-green-600/90'
                )}
              >
                {loading
                  ? '…'
                  : recruitmentOn
                    ? 'Recruitment: OPEN'
                    : 'Recruitment: CLOSED'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : (
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-4">
                  <div className="min-w-[120px] rounded-xl bg-background/80 px-5 py-4 ring-1 ring-foreground/10">
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-wide">
                      Generation
                    </p>
                    <p
                      key={active?.currentGeneration ?? '—'}
                      className="sc-hero-swap mt-1 text-2xl font-black text-purple-700 dark:text-purple-300"
                    >
                      {active?.currentGeneration || '—'}
                    </p>
                  </div>
                  <div className="min-w-[120px] rounded-xl bg-background/80 px-5 py-4 ring-1 ring-foreground/10">
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-wide">
                      Semester
                    </p>
                    <p
                      key={active?.currentSemester ?? '—'}
                      className="sc-hero-swap mt-1 text-2xl font-black text-purple-700 dark:text-purple-300"
                    >
                      {active?.currentSemester || '—'}
                    </p>
                  </div>
                </div>
                <div className="border-border flex items-center gap-4 rounded-xl border bg-muted/30 px-5 py-4">
                  <Switch
                    checked={recruitmentOn}
                    disabled={loading || busy}
                    onCheckedChange={(v) => void patchRecruitment(v)}
                  />
                  <div>
                    <p className="text-sm font-bold">Webhook intake</p>
                    <p className="text-muted-foreground text-xs">
                      {recruitmentOn
                        ? 'Logic App can POST new candidates'
                        : 'All new intake requests are rejected'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-black">Catalog overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
              <span className="text-muted-foreground text-sm">Generations</span>
              <span className="text-2xl font-black">
                {loading ? '—' : generations.length}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
              <span className="text-muted-foreground text-sm">Semesters</span>
              <span className="text-2xl font-black">
                {loading ? '—' : totalSemesters}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b border-border/60">
          <CardTitle className="text-lg font-black">Generation catalog</CardTitle>
          <CardDescription>
            Expand each generation to add semesters or click Activate on a row.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-purple-300/50 bg-purple-500/5 p-4 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <label
                htmlFor="new-generation"
                className="text-sm font-bold"
              >
                New generation
              </label>
              <input
                id="new-generation"
                type="text"
                placeholder="vd. Gen 13"
                value={newGenName}
                disabled={busy}
                onChange={(e) => setNewGenName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newGenName.trim()) {
                    void createGeneration(newGenName);
                  }
                }}
                className={inputClass}
              />
            </div>
            <Button
              disabled={busy || !newGenName.trim()}
              className="shrink-0 sm:mb-0.5"
              onClick={() => void createGeneration(newGenName)}
            >
              <i className="fa-solid fa-plus mr-2" />
              Add generation
            </Button>
          </div>

          {loading ? (
            <div className="text-muted-foreground space-y-3 py-8 text-center text-sm">
              <i className="fa-solid fa-spinner fa-spin text-2xl" />
              <p>Loading catalog…</p>
            </div>
          ) : generations.length === 0 ? (
            <div className="border-border rounded-xl border border-dashed py-16 text-center">
              <i className="fa-solid fa-layer-group text-muted-foreground mb-3 text-3xl" />
              <p className="font-bold">No generations yet</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Create your first generation using the form above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {generations.map((g) => {
                const expanded = expandedIds.has(g.id);
                const isActiveGen = active?.currentGeneration === g.name;
                const justAddedGen = highlightGenId === g.id;
                return (
                  <div
                    key={g.id}
                    className={cn(
                      'overflow-hidden rounded-xl border transition-[border-color,background-color,box-shadow] duration-300',
                      isActiveGen
                        ? 'border-purple-500/50 bg-purple-500/5 ring-1 ring-purple-500/20'
                        : 'border-border bg-card',
                      justAddedGen && 'sc-row-enter'
                    )}
                  >
                    <button
                      type="button"
                      className="hover:bg-muted/40 flex w-full items-center gap-3 px-4 py-4 text-left transition-colors"
                      onClick={() => toggleExpanded(g.id)}
                    >
                      <i
                        className={cn(
                          'fa-solid fa-chevron-right text-muted-foreground shrink-0 text-xs transition-transform duration-300',
                          expanded && 'rotate-90'
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-black">{g.name}</span>
                          {isActiveGen ? (
                            <Badge
                              key={g.name}
                              className="sc-badge-pop bg-purple-600 text-white hover:bg-purple-600/90"
                            >
                              Generation active
                            </Badge>
                          ) : null}
                          <Badge variant="secondary">
                            {g.semesters.length} semester
                          </Badge>
                        </div>
                      </div>
                    </button>

                    <div className="sc-collapsible" data-open={expanded}>
                      <div className="sc-collapsible-inner">
                        <div className="border-t border-border/60 bg-muted/20 px-4 pb-4 pt-3">
                          {g.semesters.length === 0 ? (
                            <p className="text-muted-foreground mb-3 text-sm">
                              No semesters yet — add a code below.
                            </p>
                          ) : (
                            <ul className="mb-4 space-y-2">
                              {g.semesters.map((s) => {
                                const activeRow = isActiveSemester(
                                  active,
                                  g.name,
                                  s.code
                                );
                                const semKey = `${g.id}|${s.code.toLowerCase()}`;
                                const activeKey = `${g.name.toLowerCase()}|${s.code.toLowerCase()}`;
                                const justAddedSem = highlightSemKey === semKey;
                                const justActivated =
                                  highlightActive === activeKey;
                                return (
                                  <li
                                    key={s.code}
                                    className={cn(
                                      'flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-[border-color,background-color,box-shadow] duration-300',
                                      activeRow
                                        ? 'border-green-500/50 bg-green-500/10'
                                        : 'border-border bg-background',
                                      justAddedSem && 'sc-row-enter',
                                      justActivated && 'sc-row-activate'
                                    )}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="font-mono text-sm font-bold">
                                        {s.code}
                                      </span>
                                      {activeRow ? (
                                        <Badge
                                          key={`${s.code}-active`}
                                          className="sc-badge-pop bg-green-600 text-white hover:bg-green-600/90"
                                        >
                                          Active
                                        </Badge>
                                      ) : null}
                                    </div>
                                    {!activeRow ? (
                                      <Button
                                        size="sm"
                                        disabled={busy}
                                        onClick={() =>
                                          requestActivateCohort(g.name, s.code)
                                        }
                                      >
                                        Activate
                                      </Button>
                                    ) : (
                                      <span className="text-muted-foreground text-xs font-semibold">
                                        Current cohort
                                      </span>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          )}

                          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <label className="text-xs font-bold text-muted-foreground">
                                Add semester for {g.name}
                              </label>
                              <input
                                type="text"
                                placeholder="vd. 2026B"
                                value={semesterCodes[g.id] ?? ''}
                                disabled={busy}
                                onChange={(e) =>
                                  setSemesterCodes((prev) => ({
                                    ...prev,
                                    [g.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    void addSemester(g.id, g.name);
                                  }
                                }}
                                className={inputClass}
                              />
                            </div>
                            <Button
                              variant="outline"
                              disabled={busy || !(semesterCodes[g.id] ?? '').trim()}
                              className="shrink-0"
                              onClick={() => void addSemester(g.id, g.name)}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={activateConfirm !== null}
        title="Activate cohort"
        description={
          activateConfirm ? (
            <>
              Activate cohort{' '}
              <span className="text-foreground font-semibold">
                {activateConfirm.generation} / {activateConfirm.semester}
              </span>
              ? New candidates and newly granted users will use this cohort.
              Existing records are unchanged.
            </>
          ) : (
            ''
          )
        }
        confirmLabel="Activate"
        onConfirm={() => void confirmActivateCohort()}
        onCancel={() => setActivateConfirm(null)}
        loading={busy}
      />
    </div>
  );
}

