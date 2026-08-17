import dbConnect from '@/app/(backend)/libs/dbConnect';
import AuditLog from '@/app/(backend)/models/AuditLog';
import { AUDIT_LOG_LEVELS, AUDIT_LOG_CATEGORIES } from '@/app/(backend)/types';
import type { AuditLogCategory, AuditLogLevel, IAuditLog, IAuditLogActor, IAuditLogTarget } from '@/app/(backend)/types';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 200;

export type LogSystemEventInput = {
    level: AuditLogLevel;
    category: AuditLogCategory;
    /** Short stable code, e.g. `role.granted`, `candidate.submission_failed`. */
    action: string;
    /** One-line human summary surfaced in the table. */
    message: string;
    performedBy?: IAuditLogActor;
    target?: IAuditLogTarget;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
};

/**
 * Persist a system event. **Never throws** — logging failures must not break
 * the calling request (a failed audit log would otherwise mask the real
 * error). Errors are surfaced via `console.error` so ops can correlate.
 */
export async function logSystemEvent(input: LogSystemEventInput): Promise<void> {
    try {
        await dbConnect();
        await AuditLog.create({ input });
    } catch (e) {
        console.error('[system-log] failed to persist event', {
            action: input.action,
            error: e instanceof Error ? e.message : String(e),
        });
    }
}

export type SerializedSystemLog = {
    id: string;
    level: AuditLogLevel;
    category: AuditLogCategory;
    action: string;
    message: string;
    performedBy: IAuditLogActor | null;
    target: IAuditLogTarget | null;
    metadata: Record<string, unknown> | null;
    ipAddress: string | null;
    userAgent: string | null;
    timestamp: string;
};

export type ListSystemLogsInput = {
    level?: AuditLogLevel | 'all';
    category?: AuditLogCategory | 'all';
    /** Free-text search across performedBy.email, target.email, message, action. */
    q?: string;
    /** ISO date strings. */
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
};

export type ListSystemLogsResult = {
    items: SerializedSystemLog[];
    total: number;
    page: number;
    pageSize: number;
};

function isValidLevel(v: unknown): v is AuditLogLevel {
    return typeof v === 'string' && (AUDIT_LOG_LEVELS as readonly string[]).includes(v);
}

function isValidCategory(v: unknown): v is AuditLogCategory {
    return typeof v === 'string' && (AUDIT_LOG_CATEGORIES as readonly string[]).includes(v);
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function serialize(doc: IAuditLog): SerializedSystemLog {
    return {
        id: doc._id.toString(),
        level: doc.level,
        category: doc.category,
        action: doc.action,
        message: doc.message,
        performedBy: doc.performedBy ?? null,
        target: doc.target ?? null,
        metadata:
        doc.metadata && typeof doc.metadata === 'object'
            ? (doc.metadata as Record<string, unknown>)
            : null,
        ipAddress: doc.ipAddress ?? null,
        userAgent: doc.userAgent ?? null,
        timestamp: doc.timestamp.toISOString(),
    };
}

export async function listSystemLogs(input: ListSystemLogsInput = {}): Promise<ListSystemLogsResult> {
    await dbConnect();

    // Plain query object; mongoose accepts a structural shape in v9 instead of
    // exporting the FilterQuery helper. Keeping it loose here is fine because
    // every key we set below is internally validated by the model schema.
    const filter: Record<string, unknown> = {};

    if (input.level && input.level !== 'all' && isValidLevel(input.level)) {
        filter.level = input.level;
    }
    if (input.category && input.category !== 'all' && isValidCategory(input.category)) {
        filter.category = input.category;
    }

    if (input.from || input.to) {
        const range: Record<string, Date> = {};
        if (input.from) {
            const d = new Date(input.from);
            if (!Number.isNaN(d.getTime())) 
                range.$gte = d;
        }
        if (input.to) {
            const d = new Date(input.to);
            if (!Number.isNaN(d.getTime())) 
                range.$lte = d;
        }
        if (Object.keys(range).length > 0) {
            filter.timestamp = range;
        }
    }

    const q = input.q?.trim();
    if (q) {
        const re = new RegExp(escapeRegex(q), 'i');
        filter.$or = [
            { message: re },
            { action: re },
            { 'performedBy.email': re },
            { 'target.email': re },
            { 'target.msFormResponseId': re },
            { 'target.label': re },
        ];
    }

    const pageSize = Math.min(Math.max(1, Math.floor(input.pageSize ?? DEFAULT_PAGE_SIZE)), MAX_PAGE_SIZE);
    const page = Math.max(1, Math.floor(input.page ?? 1));

    const [docs, total] = await Promise.all([
        AuditLog.find(filter)
        .sort({ timestamp: -1, _id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean<IAuditLog[]>()
        .exec(),
        AuditLog.countDocuments(filter).exec(),
    ]);

    return { items: docs.map(serialize), total, page, pageSize };
}
