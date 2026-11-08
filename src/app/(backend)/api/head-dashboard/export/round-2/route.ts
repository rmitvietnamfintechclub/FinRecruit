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

// --- 2. FORMATTING HELPERS (Đồng bộ với Round 1) ---
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

function normalizeString(str?: string | null): string {
  return str ? str.trim().toLowerCase() : '';
}

// Lấy màu nền (ARGB) cho từng phòng ban (Màu Pastel đồng bộ R1)
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
  'Department Head',
  async (
    req: NextRequest,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    { session }: { session: ActiveAppSession }
  ): Promise<Response> => {
    try {
      const searchParams = req.nextUrl.searchParams;
      const statusParam = searchParams.get('status');
      const departmentParam = searchParams.get('department'); // Giữ lại param này để filter đúng data cho ban

      if (!isExportableStatus(statusParam)) {
        return NextResponse.json(
          { success: false, message: 'Invalid export type requested.' },
          { status: 400 }
        );
      }

      if (!departmentParam) {
        return NextResponse.json(
          { success: false, message: 'Department is required for export.' },
          { status: 400 }
        );
      }

      await dbConnect();
      const active = await getActiveConfig();

      // Query database: Chỉ lấy những người ĐÃ PASS Round 1, 
      // có round2Status tương ứng, và thuộc departmentParam (nếu HeadDept chỉ được quyền xem ban mình)
      const candidates = await Candidate.find({
        status: 'Pass', // Bắt buộc lọt vào R2
        round2Status: statusParam,
        department: departmentParam,
        generation: active.currentGeneration,
        semester: active.currentSemester,
      })
        // Cập nhật lại các trường cần select cho cấu trúc cột mới
        .select('fullName email dob majorAndYear phone facebookLink department')
        .sort({ fullName: 1 }) // Xếp alpha theo tên
        .lean()
        .exec();

      const workbook = new ExcelJS.Workbook();
      const safeDeptName = departmentParam.replace(/\s+/g, '_');
      
      // Đặt tên sheet chuẩn hóa theo Round 2
      const worksheet = workbook.addWorksheet(`${safeDeptName} Probation List`);

      // Khai báo cấu trúc cột (Đã bỏ choice1, choice2, final evaluation theo yêu cầu)
      worksheet.columns = [
        { header: 'No.', key: 'no', width: 6 },
        { header: 'Full Name', key: 'name', width: 25 },
        { header: 'Student Email', key: 'email', width: 30 },
        { header: 'Date of Birth', key: 'dob', width: 15 },
        { header: 'Major & Year', key: 'major', width: 50 },
        { header: 'Phone Number', key: 'phone', width: 15 },
        { header: 'Facebook Profile', key: 'fb', width: 20 },
        { header: 'Department', key: 'department', width: 25 },
      ];

      // Format header row đồng bộ phong cách Round 1 (Nền Navy đậm, chữ Trắng)
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

        row.getCell('no').alignment = { horizontal: 'center' };

        // Xử lý chèn Link (Hyperlink màu xanh gạch chân chuẩn UI)
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

        // TÔ NỀN CỘT DEPARTMENT (Pastel color đồng bộ)
        const deptCell = row.getCell('department');
        deptCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: getDepartmentBgColor(candidate.department) },
        };
        deptCell.font = { bold: true, color: { argb: 'FF000000' } };
      });

      // Tạo Buffer xuất file
      const buffer = await workbook.xlsx.writeBuffer();

      const headers = new Headers();
      headers.append(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      headers.append(
        'Content-Disposition',
        `attachment; filename="${safeDeptName}_Round_2_${statusParam}_Export.xlsx"`
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