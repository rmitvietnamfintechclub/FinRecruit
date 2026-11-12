import {
  UserRound,
  ExternalLink,
  Phone,
  GraduationCap,
  Globe,
  Cake,
} from 'lucide-react';
import type { InterviewCandidate } from '@/lib/interview-cockpit/types';

// Helper format DOB chuẩn DD/MM/YYYY + tự tính tuổi
function formatDobWithAge(rawDob?: string): string {
  if (!rawDob) return 'N/A';
  const parsed = new Date(rawDob);
  if (Number.isNaN(parsed.getTime())) return rawDob;

  const formattedDate = parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return formattedDate;
}

export function ProfilePanel({ candidate }: { candidate: InterviewCandidate }) {
  const renderRound2StatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'pass') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 shadow-sm border border-emerald-200">
          <i className="fa-solid fa-check text-[9px]" /> ROUND 2 · PASS
        </span>
      );
    }
    if (statusLower === 'fail') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-red-800 shadow-sm border border-red-200">
          <i className="fa-solid fa-xmark text-[9px]" /> ROUND 2 · FAIL
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-800 shadow-sm border border-amber-200">
        <i className="fa-solid fa-clock text-[9px]" /> ROUND 2 · PENDING
      </span>
    );
  };

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-[24px] border border-gray-200 bg-white p-6 pb-2 shadow-sm">
      {/* 1. HEADER PROFILE & STATUS */}
      <div className="shrink-0 border-b border-gray-100 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-4 min-w-0">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0D1742] text-[#DCB968] shadow-sm">
              <UserRound className="h-7 w-7" />
            </span>
            <div className="min-w-0 pt-0.5">
              <h2 className="truncate text-xl font-black text-[#0D1742]">
                {candidate.fullName}
              </h2>
              <p className="mt-0.5 truncate text-xs font-bold text-gray-500">
                {candidate.studentId} · {candidate.department}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            {renderRound2StatusBadge(candidate.status)}
          </div>
        </div>
      </div>

      {/* 2. BODY CONTENT */}
      <div className="min-h-0 flex-1 overflow-y-auto pt-5 pr-1 space-y-6">
        {/* SECTION I: PERSONAL INFORMATION */}
        <div>
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#0D1742]/50">
            I. Personal Information
          </p>

          <div className="space-y-3">
            {/* Hàng 1: Major & Year + Date of Birth */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400">
                  <Cake className="h-3 w-3 text-pink-500" /> Date of Birth
                </p>
                <p className="mt-1 text-xs font-bold text-gray-900 truncate">
                  {formatDobWithAge(candidate.dob)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400">
                  <GraduationCap className="h-3 w-3 text-blue-500" /> Major &
                  Year
                </p>
                <p className="mt-1 text-xs font-bold text-gray-900 truncate">
                  {candidate.majorAndYear || 'N/A'}
                </p>
              </div>
            </div>

            {/* Hàng 2: Phone + Facebook + CV/Portfolio */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400">
                  <Phone className="h-3 w-3 text-emerald-500" /> Phone
                </p>
                <p className="mt-1 text-xs font-bold text-gray-900 truncate">
                  {candidate.phone || 'N/A'}
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400">
                  <Globe className="h-3 w-3 text-blue-600" /> Facebook
                </p>
                {candidate.facebookLink ? (
                  <a
                    href={candidate.facebookLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline truncate max-w-full"
                  >
                    View Profile <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  <p className="mt-1 text-xs font-semibold text-gray-400">
                    Not provided
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400">
                  <i className="fa-solid fa-file-pdf text-red-500 text-[10px]" />{' '}
                  CV / Portfolio
                </p>
                {candidate.cvLink ? (
                  <a
                    href={candidate.cvLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#0D1742] hover:underline truncate max-w-full"
                  >
                    View CV <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  <p className="mt-1 text-xs font-semibold text-gray-400">
                    Not provided
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION II: GENERAL QUESTIONS */}
        {candidate.generalAnswers && candidate.generalAnswers.length > 0 && (
          <div>
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#0D1742]/50">
              II. General Questions
            </p>
            <div className="space-y-3">
              {candidate.generalAnswers.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-gray-300"
                >
                  <p className="text-xs font-bold text-gray-900">
                    {item.question}
                  </p>
                  <p className="mt-2.5 whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-xs font-medium leading-relaxed text-gray-700 border border-gray-100">
                    {item.answer || '(No answer provided)'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION III: DEPARTMENT QUESTIONS */}
        {candidate.departmentAnswers &&
          candidate.departmentAnswers.length > 0 && (
            <div className="pb-4">
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#0D1742]/50">
                III. Department Questions
              </p>
              <div className="space-y-3">
                {candidate.departmentAnswers.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="rounded-2xl border border-blue-100 bg-blue-50/20 p-4 shadow-sm transition-all hover:border-blue-200"
                  >
                    <p className="text-xs font-bold text-gray-900 mt-1">
                      {item.question}
                    </p>
                    <p className="mt-2.5 whitespace-pre-wrap rounded-xl bg-white p-3 text-xs font-medium leading-relaxed text-gray-700 border border-blue-100 shadow-sm">
                      {item.answer || '(No answer provided)'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </section>
  );
}
