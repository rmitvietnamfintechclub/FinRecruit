export type IcsSlotPayload = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  semester?: string;
};

export function formatFriendlyDate(dateStr: string): string {
  if (!dateStr) return '';
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return dateStr;

  return parsed.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function generateIcsCalendar(
  slot: IcsSlotPayload,
  candidateName: string,
  candidateEmail: string,
  department: string
): string {
  const rawDate = slot.date.replace(/-/g, '');
  const rawStart = slot.startTime.replace(/:/g, '') + '00';
  const rawEnd = slot.endTime.replace(/:/g, '') + '00';
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `finrecruit-${slot.id}-${Date.now()}@rmitvietnamfintechclub.com`;
  const friendlyDate = formatFriendlyDate(slot.date);
  const semesterLabel = slot.semester ? ` ${slot.semester}` : '';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RMIT Vietnam FinTech Club//Fin-Recruit//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;TZID=Asia/Ho_Chi_Minh:${rawDate}T${rawStart}`,
    `DTEND;TZID=Asia/Ho_Chi_Minh:${rawDate}T${rawEnd}`,
    `SUMMARY:[RMIT FinTech Club] Round 2 Interview — ${department}`,
    `DESCRIPTION:Dear ${candidateName},\\n\\nYou are invited to attend your interview for RMIT Vietnam FinTech Club Membership Recruitment${semesterLabel} (${department}).\\n\\nDate: ${friendlyDate}\\nTime: ${slot.startTime} - ${slot.endTime}\\nRoom: ${slot.room}\\nLocation: RMIT Saigon South Campus\\n\\nPlease arrive on time and be well-prepared for the interview.`,
    `LOCATION:RMIT Saigon South Campus - Room ${slot.room}`,
    'STATUS:CONFIRMED',
    'ORGANIZER;CN=RUVN Financial Technology Club SGS:mailto:fintechclub.sgs@rmit.edu.vn',
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${candidateName}:mailto:${candidateEmail}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}