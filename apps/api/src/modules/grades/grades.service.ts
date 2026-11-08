import { Injectable } from '@nestjs/common';
import { Grade, UpdateGradeDto } from '@smartteacherbook/shared';

@Injectable()
export class GradesService {
  private gradesStore: Grade[] = [
    { id: 1, gradeNumber: 1, title: '1-sinf', priceMonthlyUzs: 69000, priceQuarterlyUzs: 172000, priceYearlyUzs: 552000, isActive: true },
    { id: 2, gradeNumber: 2, title: '2-sinf', priceMonthlyUzs: 69000, priceQuarterlyUzs: 172000, priceYearlyUzs: 552000, isActive: true },
    { id: 3, gradeNumber: 3, title: '3-sinf', priceMonthlyUzs: 79000, priceQuarterlyUzs: 197000, priceYearlyUzs: 632000, isActive: true },
    { id: 4, gradeNumber: 4, title: '4-sinf', priceMonthlyUzs: 79000, priceQuarterlyUzs: 197000, priceYearlyUzs: 632000, isActive: true },
    { id: 5, gradeNumber: 5, title: '5-sinf', priceMonthlyUzs: 89000, priceQuarterlyUzs: 222000, priceYearlyUzs: 712000, isActive: true },
    { id: 6, gradeNumber: 6, title: '6-sinf', priceMonthlyUzs: 89000, priceQuarterlyUzs: 222000, priceYearlyUzs: 712000, isActive: true },
    { id: 7, gradeNumber: 7, title: '7-sinf', priceMonthlyUzs: 89000, priceQuarterlyUzs: 222000, priceYearlyUzs: 712000, isActive: true },
    { id: 8, gradeNumber: 8, title: '8-sinf', priceMonthlyUzs: 99000, priceQuarterlyUzs: 247000, priceYearlyUzs: 792000, isActive: true },
    { id: 9, gradeNumber: 9, title: '9-sinf', priceMonthlyUzs: 99000, priceQuarterlyUzs: 247000, priceYearlyUzs: 792000, isActive: true },
    { id: 10, gradeNumber: 10, title: '10-sinf', priceMonthlyUzs: 109000, priceQuarterlyUzs: 272000, priceYearlyUzs: 872000, isActive: true },
    { id: 11, gradeNumber: 11, title: '11-sinf', priceMonthlyUzs: 119000, priceQuarterlyUzs: 299000, priceYearlyUzs: 890000, isActive: true },
  ];

  async findAll(): Promise<Grade[]> {
    return this.gradesStore;
  }

  async findOne(id: number): Promise<Grade | undefined> {
    return this.gradesStore.find((g) => g.id === id);
  }

  async update(id: number, dto: UpdateGradeDto): Promise<Grade> {
    const grade = this.gradesStore.find((g) => g.id === id);
    if (!grade) {
      throw new Error(`Grade ${id} not found`);
    }
    if (dto.priceMonthlyUzs !== undefined) grade.priceMonthlyUzs = dto.priceMonthlyUzs;
    if (dto.priceQuarterlyUzs !== undefined) grade.priceQuarterlyUzs = dto.priceQuarterlyUzs;
    if (dto.priceYearlyUzs !== undefined) grade.priceYearlyUzs = dto.priceYearlyUzs;
    if (dto.isActive !== undefined) grade.isActive = dto.isActive;
    return grade;
  }
}
