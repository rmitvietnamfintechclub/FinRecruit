import { NextResponse, type NextRequest } from 'next/server';
import { AUDIT_LOG_CATEGORIES, AUDIT_LOG_LEVELS } from '@/app/(backend)/types';
import { listSystemLogs } from '@/app/(backend)/libs/system-log/service';
import { withActiveRBAC } from '@/app/(backend)/middleware/auth&RBAC';
import type { AuditLogCategory, AuditLogLevel } from '@/app/(backend)/types';

export const runtime = 'nodejs';

function parseLevel(value: string | null): AuditLogLevel | 'all' | undefined {
    if (!value) return undefined;
    if (value === 'all') return 'all';
    return (AUDIT_LOG_LEVELS as readonly string[]).includes(value)
        ? (value as AuditLogLevel)
        : undefined;
}

function parseCategory(
    value: string | null
): AuditLogCategory | 'all' | undefined {
    if (!value) return undefined;
    if (value === 'all') return 'all';
    return (AUDIT_LOG_CATEGORIES as readonly string[]).includes(value)
        ? (value as AuditLogCategory)
        : undefined;
}

function parsePositiveInt(
    value: string | null,
    fallback: number
): number {
    if (!value) return fallback;
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const GET = withActiveRBAC('Executive Board', async (req: NextRequest) => {
    try {
        const url = new URL(req.url);
        const { searchParams } = url;

        const result = await listSystemLogs({
            level: parseLevel(searchParams.get('level')),
            category: parseCategory(searchParams.get('category')),
            q: searchParams.get('q') ?? undefined,
            from: searchParams.get('from') ?? undefined,
            to: searchParams.get('to') ?? undefined,
            page: parsePositiveInt(searchParams.get('page'), 1),
            pageSize: parsePositiveInt(searchParams.get('pageSize'), 25),
        });

        return NextResponse.json({
            success: true,
            ...result,
            filters: {
                levels: ['all', ...AUDIT_LOG_LEVELS],
                categories: ['all', ...AUDIT_LOG_CATEGORIES],
            },
        });
    } catch (e) {
        return NextResponse.json(
            {
                success: false,
                message: e instanceof Error ? e.message : 'Failed to load system logs.',
            },
            { status: 500 }
        );
    }
});
