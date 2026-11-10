'use client';

import { AlertCircle } from 'lucide-react';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { PublicPageShell } from '@/components/dashboard/PublicPageShell';
import { SegmentedControl } from '@/components/interview-scheduling/SegmentedControl';
import { SlotPicker } from '@/components/interview-scheduling/SlotPicker';
import {
  DetailRows,
  TransactionalCard,
} from '@/components/interview-scheduling/TransactionalCard';
import {
  useSubmitAvailability,
  useAvailabilityRecords,
} from '@/hooks/use-interview-scheduling';
import {
  httpGetPublicAvailability,
  httpGetInterviewerHistory,
} from '@/lib/interview-scheduling/http-api';
import {
  DEPARTMENT_META,
  DEPARTMENT_ORDER,
} from '@/lib/interview-scheduling/departments';
import type {
  InterviewDepartment,
  InterviewSlot,
  InterviewerRole,
} from '@/types/interviewScheduling';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/Tooltip';
import {
  filterSlotsByAssignedDept,
  hasHeadAvailable,
} from '@/lib/interview-scheduling/reducer';
const ROLES: InterviewerRole[] = [
  'Executive Board',
  'Department Head',
  'Member',
];
const inputClass =
  'w-full min-w-0 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-medium text-gray-900 shadow-sm transition-all hover:border-[#0D1742]/30 focus:border-[#0D1742] focus:bg-white focus:ring-1 focus:ring-[#0D1742] focus:outline-none placeholder:text-gray-400';
const labelClass =
  'mb-2 block text-[11px] font-bold tracking-widest uppercase text-[#5E5E92]';

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
  const availability = useAvailabilityRecords();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InterviewerRole>('Member');
  const [department, setDepartment] = useState<InterviewDepartment>(
    'Technology Department'
  );
  const [picks, setPicks] = useState<Picks>(emptyPicks);
  const [error, setError] = useState<string | null>(null);

  // Bổ sung state để xử lý UX khi load lịch sử
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [done, setDone] = useState<null | {
    name: string;
    role: InterviewerRole;
    department: InterviewDepartment | null;
    total: number;
  }>(null);

  useEffect(() => {
    let cancelled = false;
    httpGetPublicAvailability()
      .then((s) => !cancelled && setSlots(s))
      .catch(
        () =>
          !cancelled &&
          setError('Could not load interview slots. Please refresh.')
      )
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

  // LOGIC KHÓA (LOCK) CA PHỎNG VẤN DÀNH CHO HEAD
  const lockedForHead = useCallback(
    (slot: InterviewSlot, dept: InterviewDepartment) => {
      if (role !== 'Department Head') return false;

      // Tìm xem có ứng viên nào của phòng ban này ĐÃ BOOK ca này chưa
      const hasCandidate = slot.bookings?.some(
        (b) => b.department === dept && b.status !== 'AVAILABLE'
      );

      // Nếu có ứng viên, CA NÀY BỊ KHÓA, Head bắt buộc phải trực (phải tick)
      return hasCandidate;
    },
    [role]
  );

  // LOAD LỊCH SỬ KHI NHẬP EMAIL
  const handleLoadHistory = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^s\d{7}@rmit\.edu\.vn$/.test(normalizedEmail)) return;

    setIsLoadingHistory(true);
    setError(null);
    try {
      const history = await httpGetInterviewerHistory(normalizedEmail);
      if (history.length > 0) {
        // Tự động set Role và Department dựa trên record đầu tiên
        const firstRecord = history[0];
        if (firstRecord.interviewerRole) setRole(firstRecord.interviewerRole);
        if (firstRecord.interviewerName) setName(firstRecord.interviewerName);
        if (firstRecord.interviewerRole !== 'Executive Board') {
          setDepartment(firstRecord.department);
        }

        // Tái tạo lại Picks
        const newPicks = emptyPicks();
        history.forEach((r) => {
          newPicks[r.department].add(r.slotId);
        });
        setPicks(newPicks);
      } else {
        // Nếu không có lịch sử, reset Picks (nhưng giữ nguyên các ô đã khóa nếu có)
        setPicks(emptyPicks());
      }
    } catch (e) {
      console.error('Failed to load history', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  function toggle(dept: InterviewDepartment, slot: InterviewSlot) {
    // CẬP NHẬT: Nhận đối tượng slot thay vì id
    // Ngăn chặn việc click vào ô bị khóa bởi ứng viên (chỉ dành cho Head)
    if (lockedForHead(slot, dept)) {
      return;
    }

    setPicks((prev) => {
      const next = new Set(prev[dept]);
      if (next.has(slot.id)) next.delete(slot.id);
      else next.add(slot.id);
      return { ...prev, [dept]: next };
    });
  }

  // Tự động tick các ô bị khóa vào Picks
  useEffect(() => {
    if (role === 'Department Head' && slots.length > 0) {
      setPicks((prev) => {
        const next = { ...prev };
        let changed = false;

        const deptSlots = filterSlotsByAssignedDept(slots, department);
        deptSlots.forEach((s) => {
          if (lockedForHead(s, department) && !next[department].has(s.id)) {
            next[department] = new Set(next[department]);
            next[department].add(s.id);
            changed = true;
          }
        });

        return changed ? next : prev;
      });
    }
  }, [role, department, slots, lockedForHead]);

  async function handleSubmit() {
    setError(null);
    const normalizedName = name.trim();
    // Chuẩn hóa email: loại bỏ khoảng trắng dư thừa ở hai đầu và chuyển thành chữ thường
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName) return setError('Please enter your full name.');

    // Kiểm tra định dạng email sinh viên RMIT chính xác (sXXXXXXX@rmit.edu.vn)
    if (!/^s\d{7}@rmit\.edu\.vn$/.test(normalizedEmail)) {
      return setError(
        'Please enter a valid RMIT student email (e.g., s1234567@rmit.edu.vn).'
      );
    }

    if (total === 0) return setError('Select at least one time slot.');

    try {
      const result = await submit({
        interviewerName: normalizedName,
        interviewerEmail: normalizedEmail,
        interviewerRole: role,
        selections: activeDepartments.map((d) => ({
          department: d,
          slotIds: [...picks[d]],
        })),
      });
      if (!result.success)
        return setError(result.message ?? 'Failed to submit availability.');
      setDone({
        name: normalizedName,
        role,
        department: isEB ? null : department,
        total,
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Failed to submit availability.'
      );
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
      headerColor="navy"
      title="Interviewer Registration"
      subtitle="Select the time slots you are available to conduct interviews."
      minimal={!!done}
    >
      {done ? (
        <div className="mx-auto animate-in zoom-in-95 duration-300">
          <TransactionalCard
            variant="success"
            title="Availability Recorded"
            subtitle="Thank you! Your available interview shifts have been successfully saved."
            actions={
              <button
                type="button"
                onClick={reset}
                className="w-full rounded-xl bg-[#0D1742] px-4 py-3.5 text-sm font-bold text-[#DCB968] transition-all hover:bg-[#1a2b75] shadow-sm"
              >
                Submit Another Response
              </button>
            }
          >
            <div className="space-y-5">
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                <DetailRows
                  rows={[
                    { label: 'Full Name', value: done.name },
                    { label: 'Assigned Role', value: done.role },
                    ...(done.department
                      ? [
                          {
                            label: 'Department',
                            value: (
                              <span className="inline-flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{
                                    backgroundColor:
                                      DEPARTMENT_META[done.department].strong,
                                  }}
                                />
                                <span className="font-bold text-gray-900">
                                  {DEPARTMENT_META[done.department].full}
                                </span>
                              </span>
                            ),
                          },
                        ]
                      : []),
                    {
                      label: 'Total Shifts Selected',
                      value: (
                        <span className="inline-flex items-center justify-center rounded-lg bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-700">
                          {done.total}
                        </span>
                      ),
                    },
                  ]}
                />
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-blue-50/50 p-4 border border-blue-100">
                <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[13px] leading-relaxed text-blue-800 font-medium">
                  Need to make adjustments? You can submit this form again using
                  the same Student Email. The system will automatically replace
                  your previous selections.
                </p>
              </div>
            </div>
          </TransactionalCard>
        </div>
      ) : (
        <div className="mx-auto max-w-4xl space-y-8 pb-12 animate-in fade-in duration-500">
          <Card className="rounded-[24px] border-gray-200 bg-white shadow-sm pt-0 overflow-hidden">
            <CardHeader className="border-b border-gray-200 bg-[#0D1742] pb-4 pt-5">
              <CardTitle className="text-[15px] font-black uppercase tracking-wider text-[#DCB968]">
                Interviewer Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {' '}
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="iv-name">
                    Full Name
                  </label>
                  <input
                    id="iv-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Please enter your full name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="iv-email">
                    Student Email
                  </label>
                  <div className="relative">
                    {' '}
                    {/* BỌC TRONG DIV RELATIVE */}
                    <input
                      id="iv-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={handleLoadHistory} // BỔ SUNG SỰ KIỆN BLUR ĐỂ TẢI LỊCH SỬ
                      placeholder="sXXXXXXX@rmit.edu.vn"
                      className={`${inputClass} pr-10`}
                    />
                    {isLoadingHistory && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <i className="fa-solid fa-spinner fa-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-gray-500 flex items-start gap-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      Enter your email to automatically load your previous
                      selections.
                    </span>
                  </p>
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className={labelClass}>Organizational Role</p>
                  <SegmentedControl
                    ariaLabel="Role"
                    options={ROLES.map((r) => ({ value: r, label: r }))}
                    value={role}
                    onChange={setRole}
                    activeClassName="bg-[#0D1742] text-[#DCB968] shadow-sm"
                  />
                </div>
                {!isEB && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <p className={labelClass}>Department</p>
                    <SegmentedControl
                      ariaLabel="Department"
                      options={DEPARTMENT_ORDER.map((d) => ({
                        value: d,
                        label: DEPARTMENT_META[d].abbr,
                      }))}
                      value={department}
                      onChange={setDepartment}
                      activeClassName="bg-[#0D1742] text-[#DCB968] shadow-sm"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border-gray-200 bg-white shadow-sm pt-0 overflow-hidden">
            <CardHeader className="border-b border-gray-200 bg-[#0D1742] pb-4 pt-5">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-[15px] font-black uppercase tracking-wider text-[#DCB968]">
                  Available Shifts
                </CardTitle>
                <span className="inline-flex items-center rounded-lg bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#DCB968] backdrop-blur-sm shadow-sm">
                  Select Multiple
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <i className="fa-solid fa-spinner fa-spin text-3xl text-gray-300 mb-4" />
                  <p className="text-sm font-bold text-gray-500">
                    Loading interview slots...
                  </p>
                </div>
              ) : (
                <TooltipProvider>
                  <div className="space-y-8">
                    {activeDepartments.map((d) => {
                      const deptSlots = filterSlotsByAssignedDept(slots, d);

                      return (
                        <SlotPicker
                          key={d}
                          slots={deptSlots}
                          availability={availability}
                          band={{
                            label: DEPARTMENT_META[d].full,
                            department: d,
                          }}
                          isSelected={(s) =>
                            picks[d].has(s.id) || lockedForHead(s, d)
                          }
                          isDisabled={(s) => {
                            // 1. Kiểm tra các điều kiện khóa cũ (đã book hoặc head lock)
                            if (Boolean(lockedBy(s, d)) || lockedForHead(s, d))
                              return true;

                            // 2. Kiểm tra Head của phòng ban 'd' đã available chưa
                            if (role !== 'Department Head') {
                              const isHeadFree = hasHeadAvailable(
                                availability,
                                s.id,
                                d
                              );
                              if (!isHeadFree) return true;
                            }

                            // 3. LOGIC MỚI: Kiểm tra giới hạn số lượng Member (Chỉ áp dụng khi user chọn role là 'Member')
                            if (role === 'Member') {
                              const maxLimit = s.maxMembersPerDept?.[d] ?? 4; // Mặc định tối đa 4 nếu chưa cấu hình

                              // Đếm số lượng member hiện tại đã đăng ký vào slot này của phòng ban 'd'
                              const currentMembersCount = availability.filter(
                                (r) =>
                                  r.slotId === s.id &&
                                  r.department === d &&
                                  r.interviewerRole === 'Member'
                              ).length;

                              // Nếu đã đạt giới hạn và user này chưa từng chọn ca đó trước đó -> Disable
                              if (
                                currentMembersCount >= maxLimit &&
                                !picks[d].has(s.id)
                              ) {
                                return true;
                              }
                            }

                            return false;
                          }}
                          chipTitle={(s) => {
                            const owner = lockedBy(s, d);
                            if (owner)
                              return `You have already registered this slot for ${DEPARTMENT_META[owner].full}.`;

                            if (lockedForHead(s, d))
                              return 'Locked: A candidate is scheduled for this slot. Please contact the Executive Board to make changes.';

                            if (
                              role !== 'Department Head' &&
                              !hasHeadAvailable(availability, s.id, d)
                            ) {
                              return `This slot is unavailable because Head of ${DEPARTMENT_META[d].full} has not registered for it yet.`;
                            }

                            // Tooltip thông báo khi ca đã kín chỗ cho Member
                            if (role === 'Member') {
                              const maxLimit = s.maxMembersPerDept?.[d] ?? 4;
                              const currentMembersCount = availability.filter(
                                (r) =>
                                  r.slotId === s.id &&
                                  r.department === d &&
                                  r.interviewerRole === 'Member'
                              ).length;
                              if (
                                currentMembersCount >= maxLimit &&
                                !picks[d].has(s.id)
                              ) {
                                return `This slot has reached its maximum capacity of ${maxLimit} members for ${DEPARTMENT_META[d].full}.`;
                              }
                            }

                            return undefined;
                          }}
                          onToggle={(s) => toggle(d, s)}
                        />
                      );
                    })}
                  </div>
                </TooltipProvider>
              )}
            </CardContent>
          </Card>

          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/85 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.06)] transition-all">
            <div className="mx-auto flex max-w-4xl flex-row items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <p className="text-[13px] sm:text-[15px] font-black text-[#0D1742] truncate">
                  {total}{' '}
                  <span className="text-gray-500 font-bold">Shift(s)</span>
                </p>
                {error && (
                  <div className="flex items-center gap-1 mt-0.5 text-red-600">
                    <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                    <p
                      className="truncate text-[10px] sm:text-[11px] font-bold tracking-wide uppercase"
                      title={error}
                      role="alert"
                    >
                      {error}
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={pending || loading}
                onClick={handleSubmit}
                className="shrink-0 rounded-xl bg-[#0D1742] px-5 py-2.5 sm:px-8 sm:py-3.5 text-xs sm:text-sm font-bold text-[#DCB968] transition-all hover:bg-[#1a2b75] focus:outline-none focus:ring-2 focus:ring-[#0D1742]/50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {pending ? (
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-spinner fa-spin" />{' '}
                    <span className="hidden sm:inline">Submitting...</span>
                  </span>
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </PublicPageShell>
  );
}
