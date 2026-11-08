import { Injectable } from '@nestjs/common';
import { Subject, CreateSubjectDto, UpdateSubjectDto } from '@smartteacherbook/shared';

@Injectable()
export class SubjectsService {
  private subjectsStore: Subject[] = [
    { id: 'sub_eng_11', gradeId: 11, name: 'Ingliz tili', code: 'ENG', icon: '🇬🇧', color: '#2563EB', isActive: true },
    { id: 'sub_math_11', gradeId: 11, name: 'Matematika (Algebra)', code: 'MATH', icon: '📐', color: '#059669', isActive: true },
    { id: 'sub_phys_11', gradeId: 11, name: 'Fizika', code: 'PHYS', icon: '⚛️', color: '#7C3AED', isActive: true },
    { id: 'sub_chem_11', gradeId: 11, name: 'Kimyo', code: 'CHEM', icon: '🧪', color: '#DB2777', isActive: true },
    { id: 'sub_bio_11', gradeId: 11, name: 'Biologiya', code: 'BIO', icon: '🧬', color: '#0D9488', isActive: true },

    { id: 'sub_eng_10', gradeId: 10, name: 'Ingliz tili', code: 'ENG', icon: '🇬🇧', color: '#2563EB', isActive: true },
    { id: 'sub_math_10', gradeId: 10, name: 'Matematika (Algebra)', code: 'MATH', icon: '📐', color: '#059669', isActive: true },
    { id: 'sub_phys_10', gradeId: 10, name: 'Fizika', code: 'PHYS', icon: '⚛️', color: '#7C3AED', isActive: true },

    { id: 'sub_eng_9', gradeId: 9, name: 'Ingliz tili', code: 'ENG', icon: '🇬🇧', color: '#2563EB', isActive: true },
    { id: 'sub_math_9', gradeId: 9, name: 'Matematika', code: 'MATH', icon: '📐', color: '#059669', isActive: true },
  ];

  async findByGrade(gradeId: number): Promise<Subject[]> {
    return this.subjectsStore.filter((s) => s.gradeId === gradeId);
  }

  async findAll(): Promise<Subject[]> {
    return this.subjectsStore;
  }

  async create(dto: CreateSubjectDto): Promise<Subject> {
    const newSubject: Subject = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      gradeId: dto.gradeId || 0,
      name: dto.name,
      code: dto.code.toUpperCase(),
      icon: dto.icon || '📚',
      color: dto.color || '#2563EB',
      description: dto.description,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.subjectsStore.push(newSubject);
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
    return subject;
  }

  async delete(id: string): Promise<boolean> {
    const idx = this.subjectsStore.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.subjectsStore.splice(idx, 1);
      return true;
    }
    return false;
  }
}
