import dbConnect from '@/app/(backend)/libs/dbConnect';
import RecruitmentGeneration from '@/app/(backend)/models/RecruitmentGeneration';
import SystemConfig from '@/app/(backend)/models/SystemConfig';
import { CANDIDATE_CHOICES, type ISystemConfig }  from '@/app/(backend)/types';

export const GLOBAL_CONFIG_NAME = 'global_settings';
export const UM_DEFAULT_SEMESTER = '2026A';
export const UM_DEFAULT_GENERATION = 'Gen 12';

export type ActiveSystemConfig = {
    currentGeneration: string;
    currentSemester: string;
    isRecruitmentActive: boolean;
};

export type SerializedGeneration = {
    id: string;
    name: string;
    semesters: Array<{ code: string }>;
    createdAt: string;
};

export async function getOrCreateGlobalConfig(): Promise<ISystemConfig> {
    await dbConnect();
    let cfg = await SystemConfig.findOne({ configName: GLOBAL_CONFIG_NAME }).exec();
    if (!cfg) {
        cfg = await SystemConfig.create({
            configName: GLOBAL_CONFIG_NAME,
            currentGeneration: UM_DEFAULT_GENERATION,
            currentSemester: UM_DEFAULT_SEMESTER,
            isRecruitmentActive: false,
            departmentStates: CANDIDATE_CHOICES.map((dept) => {
                return {
                    department: dept,
                    isRound1Locked: false,
                    isRound2Locked: false,
                };
            }),
        });
    }
    return cfg;
}

export async function getActiveConfig(): Promise<ActiveSystemConfig> {
    const cfg = await getOrCreateGlobalConfig();
    return {
        currentGeneration: cfg.currentGeneration?.trim() || UM_DEFAULT_GENERATION,
        currentSemester: cfg.currentSemester?.trim() || UM_DEFAULT_SEMESTER,
        isRecruitmentActive: Boolean(cfg.isRecruitmentActive),
    };
}

export async function listGenerations(): Promise<SerializedGeneration[]> {
    await dbConnect();
    const docs = await RecruitmentGeneration.find()
        .sort({ createdAt: -1 })
        .lean()
        .exec();
    return docs.map((d) => ({
        id: d._id.toString(),
        name: d.name,
        semesters: d.semesters ?? [],
        createdAt: d.createdAt.toISOString(),
    }));
}

export async function createGeneration(name: string): Promise<SerializedGeneration> {
    await dbConnect();
    const trimmed = name.trim();
    if (!trimmed) {
        throw new Error('Generation name is required.');
    }
    const doc = await RecruitmentGeneration.create({ name: trimmed, semesters: [] });
    return {
        id: doc._id.toString(),
        name: doc.name,
        semesters: doc.semesters ?? [],
        createdAt: doc.createdAt.toISOString(),
    };
}

export async function addSemesterToGeneration(
    generationId: string,
    code: string
): Promise<SerializedGeneration> {
    await dbConnect();
    const trimmed = code.trim();
    if (!trimmed) {
        throw new Error('Semester code is required.');
    }
    const doc = await RecruitmentGeneration.findById(generationId).exec();
    if (!doc) {
        throw new Error('Generation not found.');
    }
    const exists = doc.semesters.some(
        (s: { code: string }) => s.code.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
        throw new Error('Semester already exists for this generation.');
    }
    doc.semesters.push({ code: trimmed });
    await doc.save();
    return {
        id: doc._id.toString(),
        name: doc.name,
        semesters: doc.semesters,
        createdAt: doc.createdAt.toISOString(),
    };
}

export async function activateCohort(input: { generation: string; semester: string; isRecruitmentActive?: boolean }): Promise<ActiveSystemConfig> {
    await dbConnect();
    const generation = input.generation.trim();
    const semester = input.semester.trim();
    if (!generation || !semester) {
        throw new Error('Generation and semester are required.');
    }

    const genDoc = await RecruitmentGeneration.findOne({ name: generation }).exec();
    if (!genDoc) {
        throw new Error('Generation not found in catalog.');
    }
    const hasSemester = genDoc.semesters.some(
        (s: { code: string }) => s.code.toLowerCase() === semester.toLowerCase()
    );
    if (!hasSemester) {
        throw new Error('Semester not found under this generation.');
    }

    const cfg = await getOrCreateGlobalConfig();
    cfg.currentGeneration = generation;
    cfg.currentSemester = semester;
    if (input.isRecruitmentActive !== undefined) {
        cfg.isRecruitmentActive = input.isRecruitmentActive;
    }
    await cfg.save();

    return getActiveConfig();
}

export async function setRecruitmentActive( isRecruitmentActive: boolean ): Promise<ActiveSystemConfig> {
    const cfg = await getOrCreateGlobalConfig();
    cfg.isRecruitmentActive = isRecruitmentActive;
    await cfg.save();
    return getActiveConfig();
}
