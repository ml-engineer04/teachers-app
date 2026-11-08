import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AnswerMapping, BulkAnswerMappingCsvRow } from '@smartteacherbook/shared';

@Injectable()
export class AnswerMappingsService {
  private readonly logger = new Logger(AnswerMappingsService.name);

  // In-memory fallback demo mappings
  // Clean in-memory answer mappings store
  private mappingsStore: AnswerMapping[] = [];

  clearAll() {
    this.mappingsStore = [];
    this.logger.log('🧹 Answer mappings store cleared completely.');
  }

  constructor(private readonly prisma: PrismaService) {}

  async findAll(gradeId?: number, subjectId?: string): Promise<AnswerMapping[]> {
    if (this.prisma.isConnected) {
      try {
        const where: any = {};
        if (gradeId) where.gradeId = Number(gradeId);
        if (subjectId) where.subjectId = subjectId;
        const list = await this.prisma.answerMapping.findMany({
          where,
          orderBy: { studentPageNumber: 'asc' },
        });
        return list;
      } catch (err) {
        // Fallback
      }
    }

    let list = [...this.mappingsStore];
    if (gradeId) list = list.filter((m) => m.gradeId === Number(gradeId));
    if (subjectId) list = list.filter((m) => m.subjectId === subjectId);
    return list;
  }

  async create(data: Omit<AnswerMapping, 'id'>): Promise<AnswerMapping> {
    const newMapping: AnswerMapping = {
      id: `map_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ...data,
    };

    if (this.prisma.isConnected) {
      try {
        await this.prisma.answerMapping.create({
          data: newMapping,
        });
      } catch (err: any) {
        this.logger.warn(`Prisma error, fallback to memory: ${err.message}`);
      }
    }

    this.mappingsStore.push(newMapping);
    return newMapping;
  }

  async update(id: string, data: Partial<AnswerMapping>): Promise<AnswerMapping> {
    const item = this.mappingsStore.find((m) => m.id === id);
    if (!item) {
      throw new NotFoundException(`Answer mapping ${id} not found`);
    }

    Object.assign(item, data);

    if (this.prisma.isConnected) {
      try {
        await this.prisma.answerMapping.update({
          where: { id },
          data,
        });
      } catch (err) {
        // Fallback
      }
    }

    return item;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const index = this.mappingsStore.findIndex((m) => m.id === id);
    if (index === -1) {
      throw new NotFoundException(`Answer mapping ${id} not found`);
    }

    this.mappingsStore.splice(index, 1);

    if (this.prisma.isConnected) {
      try {
        await this.prisma.answerMapping.delete({ where: { id } });
      } catch (err) {
        // Fallback
      }
    }

    return { success: true };
  }

  async importFromCsv(gradeId: number, subjectId: string, csvContent: string): Promise<{ importedCount: number }> {
    const lines = csvContent.split('\n').filter((l) => l.trim().length > 0);
    let imported = 0;

    // Header expected: exerciseLabel,studentPageNumber,teacherPageNumber,teacherExerciseLabel,notes
    const startIndex = lines[0].toLowerCase().includes('exerciselabel') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      if (parts.length >= 3) {
        const studentExerciseLabel = parts[0];
        const studentPageNumber = parseInt(parts[1], 10) || 1;
        const teacherPageNumber = parseInt(parts[2], 10) || 1;
        const teacherExerciseLabel = parts[3] || undefined;
        const notes = parts[4] || undefined;

        await this.create({
          gradeId,
          subjectId,
          studentExerciseLabel,
          studentPageNumber,
          teacherPageNumber,
          teacherExerciseLabel,
          notes,
        });
        imported++;
      }
    }

    this.logger.log(`Bulk imported ${imported} answer mappings for Grade ${gradeId} ${subjectId}`);
    return { importedCount: imported };
  }

  async exportToCsv(gradeId: number, subjectId: string): Promise<string> {
    const list = await this.findAll(gradeId, subjectId);
    const header = 'exerciseLabel,studentPageNumber,teacherPageNumber,teacherExerciseLabel,notes\n';
    const rows = list
      .map(
        (m) =>
          `"${m.studentExerciseLabel}",${m.studentPageNumber},${m.teacherPageNumber},"${m.teacherExerciseLabel || ''}","${m.notes || ''}"`,
      )
      .join('\n');
    return header + rows;
  }
}
