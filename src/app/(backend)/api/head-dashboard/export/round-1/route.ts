import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import { withRBAC } from '@/app/(backend)/guards/auth&RBAC';
import Candidate from '@/app/(backend)/models/Candidate';
import type { ActiveAppSession } from '@/app/(backend)/libs/session';
import ExcelJS from 'exceljs';

export const runtime = 'nodejs';

type ExportableStatus = 'Pass' | 'Fail';

function isExportableStatus(value: string | null): value is ExportableStatus {
  return value === 'Pass' || value === 'Fail';
}

interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
}

// Hàm format ngày sinh để chống nhầm lẫn (DD MMM YYYY - VD: 20 Sep 2007)
function formatDOB(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString; // Trả về chuỗi gốc nếu không parse được

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export const GET = withRBAC(
  'Department Head',
  async (
    req: NextRequest,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: { session: ActiveAppSession }
  ): Promise<Response> => {
    try {
      const searchParams = req.nextUrl.searchParams;
      const statusParam = searchParams.get('status');
      const departmentParam = searchParams.get('department');

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

      // Query full data dựa trên Schema thực tế
      const candidates = await Candidate.find({
        status: statusParam,
        department: departmentParam,
        generation: active.currentGeneration,
        semester: active.currentSemester,
      })
        .select(
          'fullName email dob phone majorAndYear facebookLink cvLink choice1 choice2 department'
        )
        .sort({ fullName: 1 })
        .lean()
        .exec();

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`${departmentParam} Candidates`);

      worksheet.columns = [
        { header: 'No.', key: 'no', width: 6 },
        { header: 'Full Name', key: 'name', width: 25 },
        { header: 'Student Email', key: 'email', width: 30 },
        { header: 'Date of Birth', key: 'dob', width: 15 },
        { header: 'Major & Year', key: 'major', width: 50 },
        { header: 'Phone Number', key: 'phone', width: 15 },
        { header: 'Facebook Profile', key: 'fb', width: 20 },
        { header: 'CV Link', key: 'cv', width: 20 },
        { header: '1st Choice', key: 'choice1', width: 25 },
        { header: '2nd Choice', key: 'choice2', width: 25 },
        { header: 'Final Evaluation At', key: 'department', width: 25 },
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0D1742' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      // Chèn dữ liệu
      candidates.forEach((candidate, index) => {
        const row = worksheet.addRow({
          no: index + 1,
          name: candidate.fullName,
          email: candidate.email || '—',
          dob: formatDOB(candidate.dob), // Gọi hàm format tại đây
          major: candidate.majorAndYear || '—',
          phone: candidate.phone || '—',
          fb: candidate.facebookLink || '—',
          cv: candidate.cvLink || '—',
          choice1: candidate.choice1 || '—',
          choice2: candidate.choice2 || '—',
          department: candidate.department,
        });

        row.getCell('no').alignment = { horizontal: 'center' };

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
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const headers = new Headers();
      headers.append(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      const safeDeptName = departmentParam.replace(/\s+/g, '_');
      headers.append(
        'Content-Disposition',
        `attachment; filename="${safeDeptName}_Round_1_${statusParam}_Export.xlsx"`
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