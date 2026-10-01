'use client';

import { useEffect, useMemo, useState } from 'react';
import { PublicPageShell } from '@/components/dashboard/PublicPageShell';
import { SegmentedControl } from '@/components/interview-scheduling/SegmentedControl';
import { SlotPicker } from '@/components/interview-scheduling/SlotPicker';
import { DetailRows, TransactionalCard } from '@/components/interview-scheduling/TransactionalCard';
import { useSubmitAvailability } from '@/hooks/use-interview-scheduling';
import { getInterviewSchedulingApi } from '@/lib/interview-scheduling/api';
import { DEPARTMENT_META, DEPARTMENT_ORDER } from '@/lib/interview-scheduling/departments';
import type {
  InterviewDepartment,
  InterviewSlot,
  InterviewerRole,
} from '@/types/interviewScheduling';

const ROLES: InterviewerRole[] = ['Executive Board', 'Department Head', 'Member'];
const inputClass =
  'border-input bg-background w-full rounded-xl border px-3 py-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600/40';
const labelClass = 'text-muted-foreground mb-1.5 block text-[11px] font-bold tracking-wider uppercase';

type Picks = Record<InterviewDepartment, Set<string>>;
const emptyPicks = (): Picks => ({
  'Technology Department': new Set(),
  'Business Department': new Set(),
  'Marketing Department': new Set(),
  'HR Department': new Set(),
});

export function InterviewerAvailabilityClient() {
  const { submit, pending } = useSubmitAvailability();

  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InterviewerRole>('Member');
  const [department, setDepartment] = useState<InterviewDepartment>('Technology Department');
  const [picks, setPicks] = useState<Picks>(emptyPicks);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { name: string; role: InterviewerRole; department: InterviewDepartment | null; total: number }>(null);

  useEffect(() => {
    let cancelled = false;
    getInterviewSchedulingApi()
      .getPublicAvailability()
      .then((s) => !cancelled && setSlots(s))
      .catch(() => !cancelled && setError('Could not load interview slots. Please refresh.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const isEB = role === 'Executive Board';
  const activeDepartments = useMemo(
    () => (isEB ? [...DEPARTMENT_ORDER] : [department]),
    [isEB, department]
  );
  const total = activeDepartments.reduce((n, d) => n + picks[d].size, 0);

  // Executive Board can't be in two departments at the same time: a time already picked
  // in one department is locked in the others (owner = the department that picked it).
  const timeKey = (s: InterviewSlot) => `${s.date}|${s.startTime}|${s.endTime}`;
  const timeOwners = useMemo(() => {
    const owners = new Map<string, InterviewDepartment>();
    if (!isEB) return owners;
    const byId = new Map(slots.map((s) => [s.id, s]));
    for (const d of DEPARTMENT_ORDER) {
      for (const id of picks[d]) {
        const slot = byId.get(id);
        if (slot && !owners.has(timeKey(slot))) owners.set(timeKey(slot), d);
      }
    }
    return owners;
  }, [isEB, slots, picks]);

  const lockedBy = (slot: InterviewSlot, dept: InterviewDepartment) => {
    const owner = timeOwners.get(timeKey(slot));
    return owner && owner !== dept ? owner : undefined;
  };

  function toggle(dept: InterviewDepartment, id: string) {
    setPicks((prev) => {
      const next = new Set(prev[dept]);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, [dept]: next };
    });
  }

  async function handleSubmit() {
    setError(null);
    if (!name.trim()) return setError('Please enter your full name.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Please enter a valid student email.');
    if (total === 0) return setError('Select at least one time slot.');
    try {
      const result = await submit({
        interviewerName: name.trim(),
        interviewerEmail: email.trim(),
        interviewerRole: role,
        selections: activeDepartments.map((d) => ({ department: d, slotIds: [...picks[d]] })),
      });
      if (!result.success) return setError(result.message ?? 'Failed to submit availability.');
      setDone({ name: name.trim(), role, department: isEB ? null : department, total });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit availability.');
    }
  }

  function reset() {
    setDone(null);
    setName('');
    setEmail('');
    setPicks(emptyPicks());
  }

  return (
    <PublicPageShell
      headerColor="purple"
      title="Declare Your Interview Availability"
      subtitle="Please select all time slots where you are available to conduct interviews."
    >
      {done ? (
        <TransactionalCard
          variant="success"
          title="Availability Recorded"
          subtitle="Thank you! Your interview shifts have been saved."
          actions={
            <button type="button" onClick={reset} className="w-full rounded-xl bg-[#9810FA] px-4 py-3 text-sm font-bold text-white hover:opacity-90">
              Done
            </button>
          }
        >
          <div className="space-y-4">
            <DetailRows
              rows={[
                { label: 'Name', value: done.name },
                { label: 'Role', value: done.role },
                ...(done.department
                  ? [{
                      label: 'Department',
                      value: (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DEPARTMENT_META[done.department].strong }} />
                          {DEPARTMENT_META[done.department].full}
                        </span>
                      ),
                    }]
                  : []),
                { label: 'Total shifts selected', value: done.total },
              ]}
            />
            <p className="rounded-xl bg-[#1B1F2E] p-3 text-xs leading-relaxed text-slate-300">
              Need to make changes? Just access this link and submit the form again using your Student Email.
            </p>
          </div>
        </TransactionalCard>
      ) : (
        <div className="space-y-6 pb-28">
          <section className="bg-card border-border space-y-4 rounded-2xl border p-5 shadow-sm">
            <h2 className="text-base font-extrabold">Your Details</h2>
            <div>
              <label className={labelClass} htmlFor="iv-name">Full name</label>
              <input id="iv-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Please enter your full name" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="iv-email">Student email</label>
              <input id="iv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Please enter your student email" className={inputClass} />
              <p className="text-muted-foreground mt-1.5 text-xs">Each time a user with that Student Email submits the form, the system will delete their old selection and replace it with the latest one.</p>
            </div>
            <div>
              <p className={labelClass}>Select your role</p>
              <SegmentedControl
                ariaLabel="Role"
                options={ROLES.map((r) => ({ value: r, label: r }))}
                value={role}
                onChange={setRole}
                activeClassName="bg-[#9810FA] text-white shadow-sm"
              />
            </div>
            {!isEB ? (
              <div>
                <p className={labelClass}>Select your department</p>
                <SegmentedControl
                  ariaLabel="Department"
                  options={DEPARTMENT_ORDER.map((d) => ({ value: d, label: DEPARTMENT_META[d].short }))}
                  value={department}
                  onChange={setDepartment}
                  activeClassName="bg-[#9810FA] text-white shadow-sm"
                />
              </div>
            ) : null}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-extrabold">Availability Shifts</h2>
              <span className="rounded-full bg-[#EAE7EF] px-3 py-1 text-xs font-bold text-slate-700">Select multiple shifts</span>
            </div>
            {loading ? (
              <p className="text-muted-foreground py-8 text-center text-sm">Loading slots…</p>
            ) : (
              activeDepartments.map((d) => (
                <SlotPicker
                  key={d}
                  slots={slots}
                  band={{ label: DEPARTMENT_META[d].full, department: d }}
                  isSelected={(s) => picks[d].has(s.id)}
                  isDisabled={(s) => Boolean(lockedBy(s, d))}
                  chipTitle={(s) => {
                    const owner = lockedBy(s, d);
                    return owner ? `Already selected in ${DEPARTMENT_META[owner].short}` : undefined;
                  }}
                  onToggle={(s) => toggle(d, s.id)}
                />
              ))
            )}
          </section>

          <div className="bg-card border-border fixed inset-x-0 bottom-0 z-20 border-t shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
              <div className="min-w-0">
                <p className="text-sm font-bold">{total} Slot(s) Selected</p>
                {error ? <p className="truncate text-xs font-medium text-red-600" role="alert">{error}</p> : null}
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={handleSubmit}
                className="shrink-0 rounded-xl bg-[#9810FA] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
              >
                {pending ? 'Submitting…' : 'Submit Availability'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PublicPageShell>
  );
}
