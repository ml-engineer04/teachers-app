import { Injectable, OnModuleInit } from '@nestjs/common';
import { Subject, CreateSubjectDto, UpdateSubjectDto } from '@smartteacherbook/shared';
import {
  isApiTestEnvironment,
  readJsonDiskSync,
  writeJsonDiskSync,
} from '../../common/persistence/local-disk.store';

@Injectable()
export class SubjectsService implements OnModuleInit {
  private diskEnabled = false;
  private subjectsStore: Subject[] = [
    { id: 'sub_eng', gradeId: 0, name: 'Ingliz tili', code: 'ENG', icon: '🇬🇧', color: '#4F46E5', isActive: true },
    { id: 'sub_uzb', gradeId: 0, name: 'Ona tili', code: 'UZB', icon: '📖', color: '#EA580C', isActive: true },
    { id: 'sub_math', gradeId: 0, name: 'Matematika', code: 'MATH', icon: '📐', color: '#059669', isActive: true },
    { id: 'sub_phys', gradeId: 0, name: 'Fizika', code: 'PHYS', icon: '⚛️', color: '#7C3AED', isActive: true },
    { id: 'sub_chem', gradeId: 0, name: 'Kimyo', code: 'CHEM', icon: '🧪', color: '#DB2777', isActive: true },
    { id: 'sub_bio', gradeId: 0, name: 'Biologiya', code: 'BIO', icon: '🧬', color: '#0D9488', isActive: true },
  ];

  onModuleInit() {
    this.diskEnabled = !isApiTestEnvironment();
    if (!this.diskEnabled) return;
    const saved = readJsonDiskSync<Subject[]>('subjects-state.json');
    if (Array.isArray(saved) && saved.length > 0) {
      this.subjectsStore = saved;
      return;
    }
    const snap = readJsonDiskSync<{ subjects?: Subject[] }>('live-snapshot.json');
    if (Array.isArray(snap?.subjects) && snap.subjects.length > 0) {
      this.subjectsStore = snap.subjects;
      this.persistDisk();
    }
  }

  private persistDisk() {
    if (!this.diskEnabled) return;
    writeJsonDiskSync('subjects-state.json', this.subjectsStore);
  }

  async findByGrade(gradeId: number): Promise<Subject[]> {
    return this.subjectsStore.filter((s) => s.gradeId === gradeId || s.gradeId === 0);
  }

  async findAll(): Promise<Subject[]> {
    return this.subjectsStore;
  }

  async create(dto: CreateSubjectDto): Promise<Subject> {
    const cleanCode = dto.code.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'subj';
    const newSubject: Subject = {
      id: `sub_${cleanCode}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      gradeId: dto.gradeId || 0,
      name: dto.name,
      code: dto.code.trim().toUpperCase(),
      icon: dto.icon || '📚',
      color: dto.color || '#4F46E5',
      description: dto.description,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.subjectsStore.push(newSubject);
    this.persistDisk();
    return newSubject;
  }

  async update(id: string, dto: UpdateSubjectDto): Promise<Subject> {
    const subject = this.subjectsStore.find((s) => s.id === id);
    if (!subject) {
      throw new Error(`Subject ${id} not found`);
    }
    if (dto.name) subject.name = dto.name;
    if (dto.code) subject.code = dto.code.toUpperCase();
    if (dto.icon) subject.icon = dto.icon;
    if (dto.color) subject.color = dto.color;
    if (dto.description !== undefined) subject.description = dto.description;
    if (dto.isActive !== undefined) subject.isActive = dto.isActive;
    this.persistDisk();
    return subject;
  }

  async delete(id: string): Promise<boolean> {
    const idx = this.subjectsStore.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.subjectsStore.splice(idx, 1);
      this.persistDisk();
      return true;
    }
    return false;
  }
}
