import { PrismaClient, AdminRole, BookType, BookStatus, HotspotType, MediaType, SubscriptionPlan } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SmartTeacherBook complete database seeding...');

  // 1. Seed Super Admin
  const superAdminPassword = await bcrypt.hash('Admin@SmartTeacher2026!', 10);
  const superAdmin = await prisma.admin.upsert({
    where: { email: 'superadmin@smartteacherbook.com' },
    update: {},
    create: {
      email: 'superadmin@smartteacherbook.com',
      passwordHash: superAdminPassword,
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
      totpEnabled: false,
    },
  });
  console.log(`✅ Super Admin created: ${superAdmin.email}`);

  // 2. Seed Grades 1 to 11
  const gradeMonthlyPrices: Record<number, number> = {
    1: 69000, 2: 69000, 3: 79000, 4: 79000, 5: 89000,
    6: 89000, 7: 89000, 8: 99000, 9: 99000, 10: 109000, 11: 119000,
  };

  for (let g = 1; g <= 11; g++) {
    const monthly = gradeMonthlyPrices[g] || 99000;
    const grade = await prisma.grade.upsert({
      where: { gradeNumber: g },
      update: {
        priceMonthlyUzs: monthly,
        priceQuarterlyUzs: Math.round(monthly * 2.5),
        priceYearlyUzs: Math.round(monthly * 8),
      },
      create: {
        id: g,
        gradeNumber: g,
        title: `${g}-sinf`,
        description: `O‘zbekiston maktablari uchun ${g}-sinf darsliklari va o‘qituvchi kitoblari`,
        priceMonthlyUzs: monthly,
        priceQuarterlyUzs: Math.round(monthly * 2.5),
        priceYearlyUzs: Math.round(monthly * 8),
        isActive: true,
      },
    });

    // Seed Subjects for each grade
    const subjectsList = [
      { code: 'ENG', name: 'Ingliz tili', icon: '🇬🇧', color: '#2563EB' },
      { code: 'MATH', name: 'Matematika (Algebra)', icon: '📐', color: '#059669' },
      { code: 'PHYS', name: 'Fizika', icon: '⚛️', color: '#7C3AED' },
      { code: 'CHEM', name: 'Kimyo', icon: '🧪', color: '#DB2777' },
      { code: 'BIO', name: 'Biologiya', icon: '🧬', color: '#0D9488' },
    ];

    for (const sub of subjectsList) {
      await prisma.subject.upsert({
        where: {
          gradeId_code: {
            gradeId: grade.id,
            code: sub.code,
          },
        },
        update: {},
        create: {
          gradeId: grade.id,
          name: sub.name,
          code: sub.code,
          icon: sub.icon,
          color: sub.color,
          description: `${g}-sinf ${sub.name} o‘quv dasturi`,
          isActive: true,
        },
      });
    }
  }
  console.log('✅ Grades 1 to 11 and Subjects seeded successfully.');

  // 3. Seed Demo Grade 11 English Books & Media
  const grade11 = await prisma.grade.findUnique({ where: { gradeNumber: 11 } });
  if (grade11) {
    const englishSubject = await prisma.subject.findUnique({
      where: { gradeId_code: { gradeId: grade11.id, code: 'ENG' } },
    });

    if (englishSubject) {
      const demoBook = await prisma.book.upsert({
        where: {
          gradeId_subjectId_type: {
            gradeId: grade11.id,
            subjectId: englishSubject.id,
            type: BookType.STUDENT_BOOK,
          },
        },
        update: {},
        create: {
          gradeId: grade11.id,
          subjectId: englishSubject.id,
          type: BookType.STUDENT_BOOK,
          title: "English 11: Student's Book (Demo Edition)",
          version: 1,
          status: BookStatus.PUBLISHED,
          totalPages: 6,
          totalSizeBytes: BigInt(12500000),
        },
      });

      // Media
      const audio1 = await prisma.media.upsert({
        where: { bookId_filename: { bookId: demoBook.id, filename: 'unit1_track1.mp3' } },
        update: {},
        create: {
          bookId: demoBook.id,
          type: MediaType.AUDIO,
          filename: 'unit1_track1.mp3',
          title: 'Unit 1: Modern Technology Debate',
          unitLabel: 'Unit 1, Track 1',
          sizeBytes: BigInt(2450000),
          checksumSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
          s3Key: `books/${demoBook.id}/media/unit1_track1.mp3`,
          durationSeconds: 145,
        },
      });

      const video1 = await prisma.media.upsert({
        where: { bookId_filename: { bookId: demoBook.id, filename: 'unit1_grammar.mp4' } },
        update: {},
        create: {
          bookId: demoBook.id,
          type: MediaType.VIDEO,
          filename: 'unit1_grammar.mp4',
          title: 'Unit 1 Grammar: Conditionals in Depth',
          unitLabel: 'Grammar Focus',
          sizeBytes: BigInt(18900000),
          checksumSha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
          s3Key: `books/${demoBook.id}/media/unit1_grammar.mp4`,
          durationSeconds: 310,
        },
      });

      // Pages & Hotspots
      for (let p = 1; p <= 6; p++) {
        const page = await prisma.page.upsert({
          where: { bookId_pageNumber: { bookId: demoBook.id, pageNumber: p } },
          update: {},
          create: {
            bookId: demoBook.id,
            pageNumber: p,
            imageNormalS3Key: `books/${demoBook.id}/pages/p_${p}_normal.webp`,
            imageHighS3Key: `books/${demoBook.id}/pages/p_${p}_high.webp`,
            width: 1240,
            height: 1754,
            textContent: `Unit ${Math.ceil(p / 2)}. English 11 textbook curriculum. Reading and speaking on page ${p}.`,
          },
        });

        if (p === 2) {
          await prisma.hotspot.create({
            data: {
              pageId: page.id,
              type: HotspotType.AUDIO,
              rectX: 0.08,
              rectY: 0.84,
              rectW: 0.35,
              rectH: 0.08,
              targetMediaId: audio1.id,
            },
          });
          await prisma.hotspot.create({
            data: {
              pageId: page.id,
              type: HotspotType.ANSWER_LINK,
              rectX: 0.65,
              rectY: 0.84,
              rectW: 0.28,
              rectH: 0.08,
              exerciseLabel: 'Exercise 1',
            },
          });
        }
      }

      // Answer Mapping
      await prisma.answerMapping.createMany({
        data: [
          {
            gradeId: grade11.id,
            subjectId: englishSubject.id,
            studentExerciseLabel: 'Exercise 1',
            studentPageNumber: 2,
            teacherPageNumber: 4,
            teacherExerciseLabel: "Unit 1, Ex 1: Teacher's Key",
            notes: 'Discussion answers and vocabulary deductions.',
          },
          {
            gradeId: grade11.id,
            subjectId: englishSubject.id,
            studentExerciseLabel: 'Exercise 2',
            studentPageNumber: 3,
            teacherPageNumber: 5,
            teacherExerciseLabel: 'Grammar practice answers',
            notes: 'Conditional clause rules.',
          },
        ],
        skipDuplicates: true,
      });

      console.log('✅ Demo Book, Media, Pages, Hotspots and Answer Mappings seeded.');
    }
  }

  // 4. Seed Settings
  await prisma.appSetting.upsert({
    where: { key: 'SUPPORT_CONTACT' },
    update: {},
    create: {
      key: 'SUPPORT_CONTACT',
      value: {
        phone: '+998 71 200 00 00',
        telegram: '@SmartTeacherSupport',
      },
      description: 'Support contact details',
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
