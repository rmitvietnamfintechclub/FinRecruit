import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/app/(backend)/libs/dbConnect';
import { getActiveConfig } from '@/app/(backend)/libs/system-config/service';
import { withRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import Candidate from '@/app/(backend)/models/Candidate';
import type { ActiveAppSession } from '@/app/(backend)/libs/session';
import ExcelJS from 'exceljs';

export const runtime = 'nodejs';

type ExportableStatus = 'Pass' | 'Fail';

function isExportableStatus(value: string | null): value is ExportableStatus {
    return value === 'Pass' || value === 'Fail';
}

export const GET = withRBAC(
    'Executive Board',
    async (req: NextRequest, { session }: { session: ActiveAppSession }): Promise<Response> => {
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

            // Query strictly for Round 2 evaluations
            const candidates = await Candidate.find({
                status: 'Pass', // Must have passed R1
                round2Status: statusParam,
                generation: active.currentGeneration,
                semester: active.currentSemester,
            })
                .select('fullName email department') // Add round2Evaluation.score if needed
                .sort({ department: 1 })
                .lean()
                .exec();

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Round 2 Final Data'); 

            // Define columns, including the new quantitative score
            worksheet.columns = [
                { header: 'NAME', key: 'name', width: 25 },
                { header: 'SID', key: 'sid', width: 35 },
                { header: 'Department', key: 'department', width: 25 },
                //{ header: 'R2 Score', key: 'score', width: 15 } 
            ];

            worksheet.getRow(1).font = { bold: true };

            // Map data to rows
            candidates.forEach((candidate) => {
                worksheet.addRow({
                    name: candidate.fullName,
                    sid: candidate.email, 
                    department: candidate.department,
                    // score: candidate.round2Evaluation?.score ?? 'N/A'
                });
            });

            // Write the workbook to a raw memory buffer
            const buffer = await workbook.xlsx.writeBuffer();

            const headers = new Headers();
            headers.append(
                'Content-Type', 
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            headers.append(
                'Content-Disposition', 
                `attachment; filename="Round_2_Final_${statusParam}_Export.xlsx"`
            );

            return new NextResponse(buffer, {
                status: 200,
                headers: headers,
            });
        } catch (error: unknown) {
            console.error('[export/round-2/GET] Error:', error);
            return NextResponse.json(
                { success: false, message: 'Failed to generate Round 2 Excel file.' },
                { status: 500 }
            );
        }
    }
);