import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import {
  CreateGradeDto,
  Grade,
  UpdateGradeDto,
  UpsertGradeSubjectPricingDto,
} from '@smartteacherbook/shared';
import { SubjectsService } from '../subjects/subjects.service';
import {
  isApiTestEnvironment,
  readJsonDiskSync,
  writeJsonDiskSync,
} from '../../common/persistence/local-disk.store';

export interface GradeSubjectPricingEntry {
  key: string;
  gradeId: number;
  subjectId: string;
  priceMonthlyUzs: number;
  priceQuarterlyUzs: number;
  priceYearlyUzs: number;
  updatedAt: string;
}

@Injectable()
export class GradesService implements OnModuleInit {
  private diskEnabled = false;
  constructor(private readonly subjectsService: SubjectsService) {}

  onModuleInit() {
    this.diskEnabled = !isApiTestEnvironment();
    if (!this.diskEnabled) return;
    const saved = readJsonDiskSync<{
      grades?: Grade[];
      generalPricing?: any[];
      matrix?: GradeSubjectPricingEntry[];
    }>('grades-state.json');
    if (saved) {
      if (Array.isArray(saved.grades) && saved.grades.length > 0) {
        this.gradesStore = saved.grades;
      }
      if (Array.isArray(saved.generalPricing) && saved.generalPricing.length > 0) {
        this.generalPricing = saved.generalPricing;
      }
      if (Array.isArray(saved.matrix)) {
        this.tariffMatrixStore = new Map(saved.matrix.map((m) => [m.key, m]));
      }
      this.sortGrades();
      return;
    }

    const snap = readJsonDiskSync<{
      grades?: Grade[];
      pricingMatrix?: { plans?: any[]; grades?: Grade[]; matrix?: GradeSubjectPricingEntry[] };
    }>('live-snapshot.json');
    if (snap) {
      if (Array.isArray(snap.grades) && snap.grades.length > 0) {
        this.gradesStore = snap.grades;
      }
      if (Array.isArray(snap.pricingMatrix?.plans) && snap.pricingMatrix.plans.length > 0) {
        this.generalPricing = snap.pricingMatrix.plans;
      }
      if (Array.isArray(snap.pricingMatrix?.matrix)) {
        this.tariffMatrixStore = new Map(snap.pricingMatrix.matrix.map((m) => [m.key, m]));
      }
      this.sortGrades();
      this.persistDisk();
    }
  }

  private persistDisk() {
    if (!this.diskEnabled) return;
    writeJsonDiskSync('grades-state.json', {
      grades: this.gradesStore,
      generalPricing: this.generalPricing,
      matrix: Array.from(this.tariffMatrixStore.values()),
    });
  }

  private generalPricing = [
    { id: 'MONTHLY', name: '1 Oylik Obuna', durationDays: 30, priceUzs: 119000, badge: null as string | null },
    { id: 'THREE_MONTHS', name: '3 Oylik Obuna', durationDays: 90, priceUzs: 299000, badge: 'TEJAMKOR' },
    { id: 'YEARLY', name: '1 Yillik Obuna', durationDays: 365, priceUzs: 890000, badge: 'ENG FOYDALI' },
  ];

  private gradesStore: Grade[] = [
    { id: 1, gradeNumber: 1, title: '1-sinf', priceMonthlyUzs: 59000, priceQuarterlyUzs: 149000, priceYearlyUzs: 490000, isActive: true },
    { id: 2, gradeNumber: 2, title: '2-sinf', priceMonthlyUzs: 59000, priceQuarterlyUzs: 149000, priceYearlyUzs: 490000, isActive: true },
    { id: 3, gradeNumber: 3, title: '3-sinf', priceMonthlyUzs: 69000, priceQuarterlyUzs: 175000, priceYearlyUzs: 550000, isActive: true },
    { id: 4, gradeNumber: 4, title: '4-sinf', priceMonthlyUzs: 69000, priceQuarterlyUzs: 175000, priceYearlyUzs: 550000, isActive: true },
    { id: 5, gradeNumber: 5, title: '5-sinf', priceMonthlyUzs: 79000, priceQuarterlyUzs: 199000, priceYearlyUzs: 630000, isActive: true },
    { id: 6, gradeNumber: 6, title: '6-sinf', priceMonthlyUzs: 79000, priceQuarterlyUzs: 199000, priceYearlyUzs: 630000, isActive: true },
    { id: 7, gradeNumber: 7, title: '7-sinf', priceMonthlyUzs: 89000, priceQuarterlyUzs: 229000, priceYearlyUzs: 690000, isActive: true },
    { id: 8, gradeNumber: 8, title: '8-sinf', priceMonthlyUzs: 99000, priceQuarterlyUzs: 249000, priceYearlyUzs: 750000, isActive: true },
    { id: 9, gradeNumber: 9, title: '9-sinf', priceMonthlyUzs: 99000, priceQuarterlyUzs: 249000, priceYearlyUzs: 750000, isActive: true },
    { id: 10, gradeNumber: 10, title: '10-sinf', priceMonthlyUzs: 109000, priceQuarterlyUzs: 279000, priceYearlyUzs: 820000, isActive: true },
    { id: 11, gradeNumber: 11, title: '11-sinf', priceMonthlyUzs: 119000, priceQuarterlyUzs: 299000, priceYearlyUzs: 890000, isActive: true },
  ];

  // Granular pricing matrix keyed by `${gradeId}:${canonicalSubjectId}`
  private tariffMatrixStore = new Map<string, GradeSubjectPricingEntry>();

  private sortGrades() {
    this.gradesStore.sort((a, b) => a.gradeNumber - b.gradeNumber);
  }

  async findAll(activeOnly = false): Promise<Grade[]> {
    this.sortGrades();
    if (activeOnly) {
      return this.gradesStore.filter((g) => g.isActive !== false);
    }
    return this.gradesStore;
  }

  async findOne(id: number): Promise<Grade | undefined> {
    return this.gradesStore.find((g) => g.id === id || g.gradeNumber === id);
  }

  async create(dto: CreateGradeDto): Promise<Grade> {
    const gradeNum = Math.round(Number(dto.gradeNumber));
    if (!gradeNum || gradeNum < 1 || gradeNum > 99) {
      throw new BadRequestException('Sinf raqami 1 dan 99 gacha bo‘lishi kerak');
    }
    const existing = this.gradesStore.find(
      (g) => g.gradeNumber === gradeNum || g.id === gradeNum,
    );
    if (existing) {
      throw new BadRequestException(`${gradeNum}-sinf allaqachon mavjud`);
    }

    const monthly = Number(dto.priceMonthlyUzs) > 0 ? Number(dto.priceMonthlyUzs) : 79000;
    const quarterly =
      Number(dto.priceQuarterlyUzs) > 0 ? Number(dto.priceQuarterlyUzs) : Math.round(monthly * 2.5);
    const yearly =
      Number(dto.priceYearlyUzs) > 0 ? Number(dto.priceYearlyUzs) : Math.round(monthly * 7.5);

    const created: Grade = {
      id: gradeNum,
      gradeNumber: gradeNum,
      title: dto.title?.trim() || `${gradeNum}-sinf`,
      description: dto.description?.trim(),
      priceMonthlyUzs: monthly,
      priceQuarterlyUzs: quarterly,
      priceYearlyUzs: yearly,
      isActive: dto.isActive !== undefined ? Boolean(dto.isActive) : true,
    };
    this.gradesStore.push(created);
    this.sortGrades();
    this.persistDisk();
    return created;
  }

  async update(id: number, dto: UpdateGradeDto): Promise<Grade> {
    const grade = this.gradesStore.find((g) => g.id === id || g.gradeNumber === id);
    if (!grade) {
      throw new NotFoundException(`${id}-sinf topilmadi`);
    }
    if (dto.title !== undefined && dto.title.trim()) grade.title = dto.title.trim();
    if (dto.description !== undefined) grade.description = dto.description;
    if (dto.priceMonthlyUzs !== undefined) grade.priceMonthlyUzs = Number(dto.priceMonthlyUzs);
    if (dto.priceQuarterlyUzs !== undefined) grade.priceQuarterlyUzs = Number(dto.priceQuarterlyUzs);
    if (dto.priceYearlyUzs !== undefined) grade.priceYearlyUzs = Number(dto.priceYearlyUzs);
    if (dto.isActive !== undefined) grade.isActive = Boolean(dto.isActive);
    this.persistDisk();
    return grade;
  }

  async delete(id: number): Promise<{ success: boolean }> {
    const idx = this.gradesStore.findIndex((g) => g.id === id || g.gradeNumber === id);
    if (idx === -1) {
      throw new NotFoundException(`${id}-sinf topilmadi`);
    }
    const removed = this.gradesStore.splice(idx, 1)[0];
    // Remove matrix overrides tied to deleted grade
    for (const [key, val] of this.tariffMatrixStore.entries()) {
      if (val.gradeId === removed.gradeNumber || val.gradeId === removed.id) {
        this.tariffMatrixStore.delete(key);
      }
    }
    this.persistDisk();
    return { success: true };
  }

  async resolveCanonicalSubjectId(subjectRef?: string | null): Promise<string | null> {
    if (!subjectRef || !subjectRef.trim()) return null;
    const raw = subjectRef.trim();
    const subjects = await this.subjectsService.findAll();
    const found = subjects.find(
      (s) =>
        s.id.toLowerCase() === raw.toLowerCase() ||
        s.code.toLowerCase() === raw.toLowerCase() ||
        s.name.toLowerCase() === raw.toLowerCase(),
    );
    return found ? found.id : raw;
  }

  async getGeneralPricing(gradeId?: number, subjectRef?: string) {
    const canonicalSubj = await this.resolveCanonicalSubjectId(subjectRef);
    const numGrade = gradeId ? Number(gradeId) : undefined;

    let monthly = this.generalPricing[0]?.priceUzs ?? 119000;
    let quarterly = this.generalPricing[1]?.priceUzs ?? 299000;
    let yearly = this.generalPricing[2]?.priceUzs ?? 890000;

    if (numGrade) {
      const grade = this.gradesStore.find((g) => g.id === numGrade || g.gradeNumber === numGrade);
      if (grade) {
        monthly = grade.priceMonthlyUzs;
        quarterly = grade.priceQuarterlyUzs;
        yearly = grade.priceYearlyUzs;
      }

      if (canonicalSubj) {
        const entry =
          this.tariffMatrixStore.get(`${numGrade}:${canonicalSubj}`) ||
          this.tariffMatrixStore.get(`${numGrade}:${subjectRef}`);
        if (entry) {
          monthly = entry.priceMonthlyUzs;
          quarterly = entry.priceQuarterlyUzs;
          yearly = entry.priceYearlyUzs;
        }
      }
    }

    return [
      {
        id: 'MONTHLY',
        name: this.generalPricing[0]?.name || '1 Oylik Obuna',
        durationDays: 30,
        priceUzs: monthly,
        badge: this.generalPricing[0]?.badge || null,
        gradeId: numGrade,
        subjectId: canonicalSubj,
      },
      {
        id: 'THREE_MONTHS',
        name: this.generalPricing[1]?.name || '3 Oylik Obuna',
        durationDays: 90,
        priceUzs: quarterly,
        badge: this.generalPricing[1]?.badge || 'TEJAMKOR',
        gradeId: numGrade,
        subjectId: canonicalSubj,
      },
      {
        id: 'YEARLY',
        name: this.generalPricing[2]?.name || '1 Yillik Obuna',
        durationDays: 365,
        priceUzs: yearly,
        badge: this.generalPricing[2]?.badge || 'ENG FOYDALI',
        gradeId: numGrade,
        subjectId: canonicalSubj,
      },
    ];
  }

  updateGeneralPricing(
    plans: Array<{ id: string; name?: string; durationDays?: number; priceUzs: number; badge?: string }>,
  ) {
    if (Array.isArray(plans)) {
      plans.forEach((p) => {
        const existing = this.generalPricing.find((item) => item.id === p.id);
        if (existing) {
          if (p.priceUzs !== undefined) existing.priceUzs = Number(p.priceUzs);
          if (p.name !== undefined) existing.name = p.name;
          if (p.badge !== undefined) existing.badge = p.badge;
        }
      });
    }
    this.persistDisk();
    return this.generalPricing;
  }

  async getPricingMatrix() {
    this.sortGrades();
    const subjects = await this.subjectsService.findAll();
    return {
      plans: this.generalPricing,
      grades: this.gradesStore,
      subjects,
      matrix: Array.from(this.tariffMatrixStore.values()),
    };
  }

  async upsertPricingMatrix(
    input: UpsertGradeSubjectPricingDto | UpsertGradeSubjectPricingDto[],
  ) {
    const items = Array.isArray(input) ? input : [input];
    const subjects = await this.subjectsService.findAll();

    for (const item of items) {
      const numGrade = Number(item.gradeId);
      const canonicalSubj = (await this.resolveCanonicalSubjectId(item.subjectId)) || item.subjectId;
      const monthly = Math.max(0, Number(item.priceMonthlyUzs) || 0);
      const quarterly = Math.max(0, Number(item.priceQuarterlyUzs) || 0);
      const yearly = Math.max(0, Number(item.priceYearlyUzs) || 0);

      const targetGrades = item.applyToAllGradesForSubject
        ? this.gradesStore.map((g) => g.gradeNumber)
        : [numGrade];
      const targetSubjects = item.applyToAllSubjectsForGrade
        ? subjects.map((s) => s.id)
        : [canonicalSubj];

      for (const gId of targetGrades) {
        for (const sId of targetSubjects) {
          const key = `${gId}:${sId}`;
          this.tariffMatrixStore.set(key, {
            key,
            gradeId: gId,
            subjectId: sId,
            priceMonthlyUzs: monthly,
            priceQuarterlyUzs: quarterly,
            priceYearlyUzs: yearly,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    this.persistDisk();
    return this.getPricingMatrix();
  }
}
