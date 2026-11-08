import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { ContentService, HotspotItem, MediaItem, AnswerKeyItem } from './content.service';
import { Response } from 'express';
import { BookType } from '@smartteacherbook/shared';

@ApiTags('Content & Ingestion Pipeline')
@Controller('api/v1/content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('books')
  @ApiOperation({ summary: 'List all books in catalog' })
  async getAllBooks() {
    return this.contentService.getAllBooks();
  }

  @Post('books')
  @ApiOperation({ summary: 'Create a new book entry (Admin)' })
  async createBook(@Body() body: any) {
    return this.contentService.createBook(body);
  }

  @Delete('books/:bookId')
  @ApiOperation({ summary: 'Delete a book and all associated pages & hotspots (Admin)' })
  async deleteBook(@Param('bookId') bookId: string) {
    const ok = await this.contentService.deleteBook(bookId);
    if (!ok) {
      throw new NotFoundException(`Book ${bookId} not found`);
    }
    return { success: true, message: `Book ${bookId} deleted` };
  }

  @Post('reset-all')
  @ApiOperation({ summary: 'Wipe all books, media, hotspots, and answer keys clean (Admin)' })
  async resetAllContent() {
    this.contentService.clearAllData();
    return { success: true, message: 'All content database stores wiped clean' };
  }

  @Get('books/:bookId')
  @ApiOperation({ summary: 'Get book details by id' })
  async getBookById(@Param('bookId') bookId: string) {
    const book = await this.contentService.findById(bookId);
    if (!book) {
      throw new NotFoundException(`Book ${bookId} not found`);
    }
    return book;
  }

  @Get('books/:bookId/pages')
  @ApiOperation({ summary: 'Get book pages with dimensions & hotspot counters for Visual PDF Editor' })
  async getBookPages(@Param('bookId') bookId: string) {
    return this.contentService.getBookPages(bookId);
  }

  @Get('books/:bookId/pdf')
  @ApiOperation({ summary: 'Stream raw PDF file buffer for PDF.js viewer' })
  async getPdfFile(@Param('bookId') bookId: string, @Res() res: Response) {
    const buffer = this.contentService.getPdfBuffer(bookId);
    if (!buffer) {
      throw new NotFoundException(`PDF buffer for book ${bookId} not found`);
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `inline; filename="${bookId}.pdf"`);
    res.end(buffer);
  }

  @Post('books/:bookId/cover')
  @ApiOperation({ summary: 'Upload custom cover image for a book (JPEG/PNG/WebP)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('cover'))
  async uploadBookCover(
    @Param('bookId') bookId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Muqova rasmi yuklanmadi');
    }
    const book = this.contentService.saveBookCoverImage(bookId, file);
    if (!book) {
      throw new NotFoundException(`Book ${bookId} topilmadi`);
    }
    return { success: true, coverImageUrl: book.coverImageUrl, book };
  }

  @Get('books/:bookId/cover')
  @ApiOperation({ summary: 'Stream custom book cover image' })
  async streamBookCover(@Param('bookId') bookId: string, @Res() res: Response) {
    const coverData = this.contentService.getBookCoverImage(bookId);
    if (!coverData) {
      throw new NotFoundException(`Book ${bookId} muqovasi topilmadi`);
    }
    res.setHeader('Content-Type', coverData.mimeType || 'image/jpeg');
    res.setHeader('Content-Length', coverData.buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(coverData.buffer);
  }

  @Post('books/upload-pdf')
  @ApiOperation({ summary: 'Upload textbook PDF file, extract page count & dimensions (Phase 1)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      title?: string;
      gradeId?: string;
      subjectId?: string;
      bookType?: BookType;
    },
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('PDF fayli yuklanmadi');
    }

    return this.contentService.uploadAndProcessPdf(file.buffer, file.originalname, {
      title: body.title,
      gradeId: body.gradeId ? parseInt(body.gradeId) : 7,
      subjectId: body.subjectId,
      bookType: body.bookType,
    });
  }

  @Get('grades/:gradeId/books')
  @ApiOperation({ summary: 'List published books for a grade' })
  async getBooksByGrade(@Param('gradeId', ParseIntPipe) gradeId: number) {
    return this.contentService.findByGrade(gradeId);
  }

  @Get('books/:bookId/manifest')
  @ApiOperation({ summary: 'Get book bundle manifest JSON for offline mobile download' })
  async getBookManifest(@Param('bookId') bookId: string) {
    return this.contentService.getBookManifest(bookId);
  }

  @Get('books/:bookId/validation-report')
  @ApiOperation({ summary: 'Get link annotation & media matching validation report (Admin)' })
  async getValidationReport(@Param('bookId') bookId: string) {
    return this.contentService.getValidationReport(bookId);
  }

  @Post('books/:bookId/ingest')
  @ApiOperation({ summary: 'Trigger asynchronous PDF & media ingestion job (Admin)' })
  async triggerIngestion(
    @Param('bookId') bookId: string,
    @Body() body?: { mediaFiles?: Array<{ filename: string; sizeBytes: number }> },
  ) {
    return this.contentService.triggerIngestion(bookId, body?.mediaFiles);
  }

  @Patch('books/:bookId/publish')
  @ApiOperation({ summary: 'Publish or unpublish book bundle (Admin)' })
  async togglePublish(
    @Param('bookId') bookId: string,
    @Body() body: { isPublished: boolean },
  ) {
    return this.contentService.togglePublish(bookId, body.isPublished);
  }

  @Get('books/:bookId/publish-validation')
  @ApiOperation({ summary: 'Run validation report before publishing (Phase 5)' })
  async getPublishValidationReport(@Param('bookId') bookId: string) {
    return this.contentService.validateBookForPublish(bookId);
  }

  @Post('books/:bookId/publish')
  @ApiOperation({ summary: 'Validate & publish book bundle (Phase 5)' })
  async publishBookWithValidation(
    @Param('bookId') bookId: string,
    @Body() body?: { force?: boolean },
  ) {
    return this.contentService.publishBookWithValidation(bookId, body?.force);
  }

  @Post('books/:bookId/detect-links')
  @ApiOperation({ summary: 'Extract & detect embedded hyperlinks / media annotations (Phase 5)' })
  async detectPdfLinks(@Param('bookId') bookId: string) {
    return this.contentService.detectPdfLinks(bookId);
  }

  @Get('books/:bookId/hotspots')
  @ApiOperation({ summary: 'Get all visual hotspots for a textbook' })
  async getBookHotspots(@Param('bookId') bookId: string) {
    return this.contentService.getBookHotspots(bookId);
  }

  @Post('books/:bookId/hotspots')
  @ApiOperation({ summary: 'Save & validate normalized hotspots for a textbook (Phase 2)' })
  async saveBookHotspots(
    @Param('bookId') bookId: string,
    @Body() body: { hotspots: HotspotItem[] },
  ) {
    if (!body || !Array.isArray(body.hotspots)) {
      throw new BadRequestException('Hotspotlar massivi taqdim etilmadi');
    }
    return this.contentService.saveBookHotspots(bookId, body.hotspots);
  }

  @Delete('books/:bookId/hotspots/:hotspotId')
  @ApiOperation({ summary: 'Delete a single hotspot from a textbook (Phase 2)' })
  async deleteHotspot(
    @Param('bookId') bookId: string,
    @Param('hotspotId') hotspotId: string,
  ) {
    return this.contentService.deleteHotspot(bookId, hotspotId);
  }

  @Get('media')
  @ApiOperation({ summary: 'List uploaded audio and video media library (Phase 3)' })
  async getMediaList(
    @Query('bookId') bookId?: string,
    @Query('type') type?: 'AUDIO' | 'VIDEO',
    @Query('search') search?: string,
    @Query('unit') unit?: string,
  ) {
    return this.contentService.getAllMedia({ bookId, type, search, unit });
  }

  @Get('media/:id')
  @ApiOperation({ summary: 'Get media file details by id (Phase 3)' })
  async getMediaById(@Param('id') id: string) {
    const item = this.contentService.getMediaById(id);
    if (!item) {
      throw new NotFoundException(`Media ${id} not found`);
    }
    return item;
  }

  @Post('media')
  @ApiOperation({ summary: 'Register/upload a new audio or video file into library (Phase 3)' })
  async createMedia(@Body() body: Partial<MediaItem>) {
    return this.contentService.createOrRegisterMedia(body);
  }

  @Post('media/upload')
  @ApiOperation({ summary: 'Upload real audio (MP3/WAV/M4A) or video (MP4/MOV) file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMediaFile(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      title?: string;
      type?: 'AUDIO' | 'VIDEO';
      bookId?: string;
      unitLabel?: string;
      durationSeconds?: string;
    },
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Media fayli yuklanmadi');
    }

    return this.contentService.uploadAndSaveMediaFile(file, {
      title: body.title,
      type: body.type,
      bookId: body.bookId,
      unitLabel: body.unitLabel,
      durationSeconds: body.durationSeconds ? parseInt(body.durationSeconds) : undefined,
    });
  }

  @Get('media/:id/file')
  @ApiOperation({ summary: 'Stream uploaded media audio or video file' })
  async streamMediaFile(@Param('id') id: string, @Res() res: Response) {
    const media = this.contentService.getMediaById(id);
    if (!media) {
      throw new NotFoundException(`Media ${id} topilmadi`);
    }

    const fileData = this.contentService.getMediaFileBuffer(id);
    if (!fileData) {
      if (media.url && media.url.startsWith('http') && !media.url.includes('/api/v1/content/media/')) {
        return res.redirect(media.url);
      }
      throw new NotFoundException(`Media ${id} fayli serverda topilmadi`);
    }

    const mime =
      fileData.mimeType ||
      (media.type === 'AUDIO' ? 'audio/mpeg' : 'video/mp4');

    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', fileData.buffer.length);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Disposition', `inline; filename="${media.filename}"`);
    res.send(fileData.buffer);
  }

  @Patch('books/:bookId')
  @ApiOperation({ summary: 'Update book details (title, description, pages, status)' })
  async updateBookDetails(
    @Param('bookId') bookId: string,
    @Body() body: any,
  ) {
    const updated = this.contentService.updateBook(bookId, body);
    if (!updated) {
      throw new NotFoundException(`Book ${bookId} not found`);
    }
    return updated;
  }

  @Delete('media/:id')
  @ApiOperation({ summary: 'Delete a media file from library (Phase 3)' })
  async deleteMedia(@Param('id') id: string) {
    const ok = this.contentService.deleteMedia(id);
    if (!ok) {
      throw new NotFoundException(`Media ${id} not found`);
    }
    return { success: true };
  }

  // ==========================================
  // PHASE 4: TEACHER'S BOOK & ANSWER KEY APIS
  // ==========================================
  @Get('teacher-books')
  @ApiOperation({ summary: 'Get list of Teacher’s Books for Answer Mapping (Phase 4)' })
  async getTeacherBooks(@Query('gradeId') gradeId?: number) {
    return this.contentService.getTeacherBooks(gradeId ? Number(gradeId) : undefined);
  }

  @Get('teacher-books/:id/pages/:pageNum')
  @ApiOperation({ summary: 'Get preview & mapped answers for a specific Teacher’s Book page (Phase 4)' })
  async getTeacherBookPageDetails(
    @Param('id') id: string,
    @Param('pageNum', ParseIntPipe) pageNum: number,
  ) {
    return this.contentService.getTeacherBookPageDetails(id, pageNum);
  }

  @Get('answers')
  @ApiOperation({ summary: 'List and search Teacher’s Book answer keys (Phase 4)' })
  async getAnswerKeys(
    @Query('studentBookId') studentBookId?: string,
    @Query('teacherBookId') teacherBookId?: string,
    @Query('studentPage') studentPage?: number,
    @Query('search') search?: string,
    @Query('unit') unit?: string,
  ) {
    return this.contentService.getAllAnswerKeys({
      studentBookId,
      teacherBookId,
      studentPage,
      search,
      unit,
    });
  }

  @Get('answers/:id')
  @ApiOperation({ summary: 'Get single answer key item by id (Phase 4)' })
  async getAnswerKeyById(@Param('id') id: string) {
    const item = this.contentService.getAnswerKeyById(id);
    if (!item) {
      throw new NotFoundException(`Answer key ${id} not found`);
    }
    return item;
  }

  @Post('answers')
  @ApiOperation({ summary: 'Create or update an answer key mapping (Phase 4)' })
  async createOrUpdateAnswerKey(@Body() body: Partial<AnswerKeyItem>) {
    return this.contentService.createOrUpdateAnswerKey(body);
  }

  @Post('answers/upload')
  @ApiOperation({ summary: 'Upload Answer Key with screenshot photo OR text' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  async uploadAnswerKeyWithImage(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      studentBookId?: string;
      teacherBookId?: string;
      studentPageNumber?: string;
      teacherPageNumber?: string;
      exerciseNumber?: string;
      exerciseTitle?: string;
      solutionKey?: string;
      methodologyNotes?: string;
    },
  ) {
    return this.contentService.saveAnswerKeyWithImage(file, {
      studentBookId: body.studentBookId,
      teacherBookId: body.teacherBookId,
      studentPageNumber: body.studentPageNumber ? parseInt(body.studentPageNumber) : 1,
      teacherPageNumber: body.teacherPageNumber ? parseInt(body.teacherPageNumber) : 1,
      exerciseNumber: body.exerciseNumber || body.exerciseTitle || 'Mashq',
      exerciseTitle: body.exerciseTitle || body.exerciseNumber || 'Mashq',
      solutionKey: body.solutionKey,
      methodologyNotes: body.methodologyNotes,
    });
  }

  @Get('answers/:id/image')
  @ApiOperation({ summary: 'Stream answer key screenshot image' })
  async streamAnswerKeyImage(@Param('id') id: string, @Res() res: Response) {
    const imgData = this.contentService.getAnswerKeyImage(id);
    if (!imgData) {
      throw new NotFoundException(`Answer key image ${id} topilmadi`);
    }
    res.setHeader('Content-Type', imgData.mimeType || 'image/jpeg');
    res.setHeader('Content-Length', imgData.buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(imgData.buffer);
  }

  @Delete('answers/:id')
  @ApiOperation({ summary: 'Delete an answer key mapping (Phase 4)' })
  async deleteAnswerKey(@Param('id') id: string) {
    const ok = this.contentService.deleteAnswerKey(id);
    if (!ok) {
      throw new NotFoundException(`Answer key ${id} not found`);
    }
    return { success: true };
  }
}
