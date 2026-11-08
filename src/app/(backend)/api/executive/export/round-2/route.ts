import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import { withRBAC } from '@/app/(backend)/guards/auth&RBAC';
import Candidate from '@/app/(backend)/models/Candidate';
import type { ActiveAppSession } from '@/app/(backend)/libs/session';
import ExcelJS from 'exceljs';

export const runtime = 'nodejs';

// --- 1. TYPE & VALIDATION HELPERS ---
type ExportableStatus = 'Pass' | 'Fail';

function isExportableStatus(value: string | null): value is ExportableStatus {
  return value === 'Pass' || value === 'Fail';
}

interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
}

// --- 2. FORMATTING HELPERS ---
function formatDOB(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

// Chuẩn hóa chuỗi để so sánh
function normalizeString(str?: string | null): string {
  return str ? str.trim().toLowerCase() : '';
}

// Lấy màu nền (ARGB) cho từng phòng ban (Màu Pastel đồng bộ Round 1)
function getDepartmentBgColor(deptName?: string | null): string {
  const name = normalizeString(deptName);
  if (name.includes('tech')) return 'FFD0E2FF'; // Light Blue
  if (name.includes('business')) return 'FFFFE5B4'; // Peach / Light Orange
  if (name.includes('marketing')) return 'FFFFD6D6'; // Light Pink / Red
  if (name.includes('design')) return 'FFE8D8FF'; // Light Purple
  if (name.includes('hr') || name.includes('human')) return 'FFD9EAD3'; // Light Green

  return 'FFF3F4F6'; // Default: Light Gray
}

// --- 3. MAIN API HANDLER ---
export const GET = withRBAC(
  'Executive Board',
  async (
    req: NextRequest,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: { session: ActiveAppSession }
  ): Promise<Response> => {
    try {
      const searchParams = req.nextUrl.searchParams;
      const statusParam = searchParams.get('status');

      if (!isExportableStatus(statusParam)) {
        return NextResponse.json(
          { success: false, message: 'Invalid export type requested.' },
          { status: 400 }
        );
      }

      await dbConnect();
      const active = await getActiveConfig();

      // Query lấy ứng viên đã qua R1 (status: 'Pass') và nằm trong diện đánh giá R2 tương ứng
      const candidates = await Candidate.find({
        status: 'Pass',
        round2Status: statusParam,
        generation: active.currentGeneration,
        semester: active.currentSemester,
      })
        .select(
          'fullName email dob phone majorAndYear facebookLink cvLink department'
        )
        .sort({ department: 1, fullName: 1 })
        .lean()
        .exec();

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`Round_2_${statusParam}`);

      worksheet.columns = [
        { header: 'No.', key: 'no', width: 6 },
        { header: 'Full Name', key: 'name', width: 25 },
        { header: 'Student Email', key: 'email', width: 30 },
        { header: 'Date of Birth', key: 'dob', width: 15 },
        { header: 'Major & Year', key: 'major', width: 45 },
        { header: 'Phone Number', key: 'phone', width: 15 },
        { header: 'Facebook Profile', key: 'fb', width: 20 },
        { header: 'Department', key: 'department', width: 25 }, // Đã lược bỏ cột CV Link
      ];

      // Format header row đồng bộ màu Navy đặc trưng
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0D1742' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      // Chèn dữ liệu và tô màu
      candidates.forEach((candidate, index) => {
        const row = worksheet.addRow({
          no: index + 1,
          name: candidate.fullName,
          email: candidate.email || '—',
          dob: formatDOB(candidate.dob),
          major: candidate.majorAndYear || '—',
          phone: candidate.phone || '—',
          fb: candidate.facebookLink || '—',
          department: candidate.department || '—',
        });

        // Canh giữa số thứ tự
        row.getCell('no').alignment = { horizontal: 'center' };

        // Xử lý Links Facebook
        if (candidate.facebookLink) {
          row.getCell('fb').value = {
            text: 'View Profile',
            hyperlink: candidate.facebookLink,
          };
          row.getCell('fb').font = {
            color: { argb: 'FF0563C1' },
            underline: true,
          };
        }

        // --- TÔ MÀU PHÒNG BAN CHO CỘT DEPARTMENT ---
        const deptCell = row.getCell('department');
        deptCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: getDepartmentBgColor(candidate.department) },
        };
        deptCell.font = { bold: true, color: { argb: 'FF000000' } };
      });

      const buffer = await workbook.xlsx.writeBuffer();

      const headers = new Headers();
      headers.append(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      headers.append(
        'Content-Disposition',
        `attachment; filename="Round_2_Master_${statusParam}_List.xlsx"`
      );

      return new NextResponse(buffer, {
        status: 200,
        headers: headers,
      });
    } catch (error: unknown) {
      console.error('[export/round-2/GET] Error:', error);
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      const errorResponse: ErrorResponse = {
        success: false,
        message: 'Failed to generate Round 2 Excel file.',
        error: process.env.NODE_ENV === 'development' ? message : undefined,
      };

      return NextResponse.json(errorResponse, { status: 500 });
    }
  }
);
