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

// Chuẩn hóa chuỗi để so sánh (chống lỗi do dư khoảng trắng hoặc khác hoa/thường)
function normalizeString(str?: string | null): string {
  return str ? str.trim().toLowerCase() : '';
}

// Lấy màu nền (ARGB) cho từng phòng ban (Màu Pastel dịu mắt để chữ đen vẫn dễ đọc)
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

      const candidates = await Candidate.find({
        status: statusParam,
        generation: active.currentGeneration,
        semester: active.currentSemester,
      })
        .select(
          'fullName email dob phone majorAndYear facebookLink cvLink choice1 choice2 department'
        )
        // Sort theo department để gom nhóm dễ nhìn, sau đó xếp theo bảng chữ cái tên
        .sort({ department: 1, fullName: 1 })
        .lean()
        .exec();

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`Round_1_${statusParam}`);

      worksheet.columns = [
        { header: 'No.', key: 'no', width: 6 },
        { header: 'Full Name', key: 'name', width: 25 },
        { header: 'Student Email', key: 'email', width: 30 },
        { header: 'Date of Birth', key: 'dob', width: 15 },
        { header: 'Major & Year', key: 'major', width: 45 },
        { header: 'Phone Number', key: 'phone', width: 15 },
        { header: 'Facebook Profile', key: 'fb', width: 20 },
        { header: 'CV Link', key: 'cv', width: 20 },
        { header: '1st Choice', key: 'choice1', width: 25 },
        { header: '2nd Choice', key: 'choice2', width: 25 },
        { header: 'Final Evaluation At', key: 'department', width: 25 },
      ];

      // Format header row đồng bộ
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0D1742' }, // Màu navy đặc trưng của app
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
          cv: candidate.cvLink || '—',
          choice1: candidate.choice1 || '—',
          choice2: candidate.choice2 || '—',
          department: candidate.department || '—',
        });

        // Canh giữa số thứ tự
        row.getCell('no').alignment = { horizontal: 'center' };

        // Xử lý Links
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
        if (candidate.cvLink) {
          row.getCell('cv').value = {
            text: 'View CV',
            hyperlink: candidate.cvLink,
          };
          row.getCell('cv').font = {
            color: { argb: 'FF0563C1' },
            underline: true,
          };
        }

        // --- XỬ LÝ HIGHLIGHT & TÔ MÀU PHÒNG BAN ---
        const deptCell = row.getCell('department');
        const choice1Cell = row.getCell('choice1');
        const choice2Cell = row.getCell('choice2');

        // 1. Tô nền cột Final Evaluation theo ban
        deptCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: getDepartmentBgColor(candidate.department) },
        };
        deptCell.font = { bold: true, color: { argb: 'FF000000' } }; // Mặc định chữ đen in đậm

        // 2. Kiểm tra xem ca này có bị đẩy sang NV2 không?
        const cDept = normalizeString(candidate.department);
        const c1 = normalizeString(candidate.choice1);
        const c2 = normalizeString(candidate.choice2);

        // Bị đẩy sang NV2 = Eval Dept giống NV2, nhưng khác NV1
        const isPushedToSecondChoice =
          cDept && c2 && cDept === c2 && cDept !== c1;

        if (isPushedToSecondChoice) {
          // A. Làm nổi bật cột Department bằng chữ màu Đỏ tươi (Red)
          deptCell.font = { bold: true, color: { argb: 'FFB82649' } };

          // B. Đánh dấu cột NV2 bằng nền Vàng nhạt (Cảnh báo chú ý)
          choice2Cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFEFCA' },
          };
          choice2Cell.font = { bold: true, color: { argb: 'FFA28436' } };

          // C. Gạch bỏ (Strikethrough) và làm mờ cột NV1 để biết đã bị loại/từ chối
          choice1Cell.font = { strike: true, color: { argb: 'FF9CA3AF' } };
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();

      const headers = new Headers();
      headers.append(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      headers.append(
        'Content-Disposition',
        `attachment; filename="Round_1_Master_${statusParam}_List.xlsx"`
      );

      return new NextResponse(buffer, {
        status: 200,
        headers: headers,
      });
    } catch (error: unknown) {
      console.error('[export/GET] Error:', error);
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      const errorResponse: ErrorResponse = {
        success: false,
        message: 'Failed to generate Excel file.',
        error: process.env.NODE_ENV === 'development' ? message : undefined,
      };

      return NextResponse.json(errorResponse, { status: 500 });
    }
  }
);
