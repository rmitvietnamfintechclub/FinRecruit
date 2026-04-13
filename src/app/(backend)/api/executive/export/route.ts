import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import Candidate from '@/app/(backend)/models/Candidate';
import type { ActiveAppSession } from '@/app/(backend)/libs/session';
import ExcelJS from 'exceljs';

export const runtime = 'nodejs';

// Validation helper
type ExportableStatus = 'Pass' | 'Fail';

function isExportableStatus(value: string | null): value is ExportableStatus {
  return value === 'Pass' || value === 'Fail';
}

interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
}

export const GET = withRBAC(
  'Executive Board',
  async (req: NextRequest, context: { session: ActiveAppSession }): Promise<Response> => {
    try {
      // Parse query parameters
      const searchParams = req.nextUrl.searchParams;
      const statusParam = searchParams.get('status');

      if (!isExportableStatus(statusParam)) {
        return NextResponse.json(
          { success: false, message: 'Invalid export type requested.' },
          { status: 400 }
        );
      }

      // Connect to database
      await dbConnect();

      // Query database
      const candidates = await Candidate.find({ status: statusParam })
        .select('fullName email department')
        .sort({ department: 1 })
        .lean()
        .exec();

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Mail Merge Data'); 

      // Define the exact three columns required
      worksheet.columns = [
        { header: 'NAME', key: 'name', width: 25 },
        { header: 'SID', key: 'sid', width: 35 },
        { header: 'Department', key: 'department', width: 25 }
      ];

      // Make the header row bold for better UX
      worksheet.getRow(1).font = { bold: true };

      // Loop through database results and add rows
      candidates.forEach((candidate) => {
        worksheet.addRow({
          name: candidate.fullName,
          sid: candidate.email, // Map email to SID column
          department: candidate.department,
        });
      });

      // Write the workbook to a raw memory buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set headers telling the browser this is an Excel file meant to be downloaded
      const headers = new Headers();
      headers.append(
        'Content-Type', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      headers.append(
        'Content-Disposition', 
        `attachment; filename="${statusParam}_List_Export.xlsx"`
      );

      // Return the binary buffer directly, not JSON!
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