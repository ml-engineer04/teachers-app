const API_BASE = 'http://localhost:4000/api/v1';

const ADMIN_TOKEN_KEY = 'stb_admin_token';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API Error ${res.status}: ${errorText}`);
  }
  return res.json();
}

export const api = {
  // Authentication
  async login(email: string, password: string) {
    const data = await fetchJson<{ accessToken: string; admin: { id: string; email: string; role: string } }>(
      '/admin/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
    );
    if (data.accessToken && typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_TOKEN_KEY, data.accessToken);
    }
    return data;
  },

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem('stb_admin_session');
    }
  },

  // Dashboard
  async getDashboardStats() {
    return fetchJson<any>('/admin/dashboard/stats');
  },

  // Requests (Sales Desk)
  async getRequests(params?: { status?: string; gradeId?: number; search?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.gradeId) query.set('gradeId', String(params.gradeId));
    if (params?.search) query.set('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<any[]>(`/admin/requests${qs}`);
  },

  async markContacted(requestId: string, internalNote?: string) {
    return fetchJson<any>(`/admin/requests/${requestId}/contacted`, {
      method: 'PATCH',
      body: JSON.stringify({ internalNote }),
    });
  },

  async grantAccess(requestId: string, durationDays: number, note?: string) {
    return fetchJson<any>(`/admin/requests/${requestId}/grant`, {
      method: 'POST',
      body: JSON.stringify({ durationDays, note }),
    });
  },

  async rejectAccess(requestId: string, reason: string) {
    return fetchJson<any>(`/admin/requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // Grades & Pricing
  async getGrades() {
    return fetchJson<any[]>('/grades');
  },

  async updateGrade(id: number, data: { priceMonthlyUzs?: number; priceQuarterlyUzs?: number; priceYearlyUzs?: number; isActive?: boolean }) {
    return fetchJson<any>(`/grades/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Subjects
  async getSubjects(gradeId?: number) {
    const qs = gradeId ? `?gradeId=${gradeId}` : '';
    return fetchJson<any[]>(`/subjects${qs}`);
  },

  // Content & Books Management
  async getAllBooks() {
    return fetchJson<any[]>('/content/books');
  },

  async createBook(data: {
    title: string;
    gradeId: number;
    subjectId: string;
    type?: string;
    totalPages?: number;
    description?: string;
  }) {
    return fetchJson<any>('/content/books', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async uploadBookPdf(file: File, metadata?: { title?: string; gradeId?: number; subjectId?: string; bookType?: string }) {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata?.title) formData.append('title', metadata.title);
    if (metadata?.gradeId) formData.append('gradeId', String(metadata.gradeId));
    if (metadata?.subjectId) formData.append('subjectId', metadata.subjectId);
    if (metadata?.bookType) formData.append('bookType', metadata.bookType);

    const token = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
    const res = await fetch(`${API_BASE}/content/books/upload-pdf`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`PDF upload failed (${res.status}): ${errText}`);
    }
    return res.json();
  },

  async deleteBook(bookId: string) {
    return fetchJson<any>(`/content/books/${bookId}`, {
      method: 'DELETE',
    });
  },

  async updateBook(bookId: string, updates: any) {
    return fetchJson<any>(`/content/books/${bookId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async uploadBookCover(bookId: string, file: File) {
    const formData = new FormData();
    formData.append('cover', file);
    const token = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
    const res = await fetch(`${API_BASE}/content/books/${bookId}/cover`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Muqova yuklashda xatolik: ${err}`);
    }
    return res.json();
  },

  async getBooksByGrade(gradeId: number) {
    return fetchJson<any[]>(`/content/grades/${gradeId}/books`);
  },

  // Media Library (Audio & Video)
  async getMedia(params?: { bookId?: string; type?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.bookId) query.set('bookId', params.bookId);
    if (params?.type) query.set('type', params.type);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<any[]>(`/content/media${qs}`);
  },

  async createMedia(data: {
    type: 'AUDIO' | 'VIDEO';
    filename: string;
    title: string;
    unitLabel: string;
    durationSeconds?: number;
    sizeBytes?: number;
    url?: string;
    bookId?: string;
  }) {
    return fetchJson<any>('/content/media', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async uploadMediaFile(
    file: File,
    metadata?: {
      title?: string;
      type?: 'AUDIO' | 'VIDEO';
      bookId?: string;
      unitLabel?: string;
      durationSeconds?: number;
    },
  ) {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata?.title) formData.append('title', metadata.title);
    if (metadata?.type) formData.append('type', metadata.type);
    if (metadata?.bookId) formData.append('bookId', metadata.bookId);
    if (metadata?.unitLabel) formData.append('unitLabel', metadata.unitLabel);
    if (metadata?.durationSeconds) formData.append('durationSeconds', String(metadata.durationSeconds));

    const token = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
    const res = await fetch(`${API_BASE}/content/media/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Media yuklashda xatolik: ${err}`);
    }
    return res.json();
  },

  async deleteMedia(id: string) {
    return fetchJson<any>(`/content/media/${id}`, {
      method: 'DELETE',
    });
  },

  async getValidationReport(bookId: string) {
    return fetchJson<any>(`/content/books/${bookId}/validation-report`);
  },

  async triggerIngestion(bookId: string, mediaFiles?: any[]) {
    return fetchJson<any>(`/content/books/${bookId}/ingest`, {
      method: 'POST',
      body: JSON.stringify({ mediaFiles }),
    });
  },

  async togglePublishBook(bookId: string, isPublished: boolean) {
    return fetchJson<any>(`/content/books/${bookId}/publish`, {
      method: 'PATCH',
      body: JSON.stringify({ isPublished }),
    });
  },

  async getBookManifest(bookId: string) {
    return fetchJson<any>(`/content/books/${bookId}/manifest`);
  },

  // Answer Mappings (Teacher ↔ Student Book)
  async getAnswerMappings(gradeId?: number, subjectId?: string) {
    const query = new URLSearchParams();
    if (gradeId) query.set('gradeId', String(gradeId));
    if (subjectId) query.set('subjectId', subjectId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<any[]>(`/answer-mappings${qs}`);
  },

  async createAnswerMapping(data: any) {
    return fetchJson<any>('/answer-mappings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async uploadAnswerKeyWithImage(
    file: File | undefined,
    data: {
      gradeId?: number;
      subjectId?: string;
      studentBookId?: string;
      teacherBookId?: string;
      studentPageNumber?: number;
      teacherPageNumber?: number;
      exerciseNumber?: string;
      exerciseTitle?: string;
      studentExerciseLabel?: string;
      teacherExerciseLabel?: string;
      solutionKey?: string;
      methodologyNotes?: string;
      notes?: string;
      format?: 'TEXT' | 'IMAGE' | 'BOTH';
    },
  ) {
    let imageUrl: string | undefined;

    if (file) {
      const formData = new FormData();
      formData.append('image', file);
      if (data.studentPageNumber) formData.append('studentPageNumber', String(data.studentPageNumber));
      if (data.teacherPageNumber) formData.append('teacherPageNumber', String(data.teacherPageNumber));
      formData.append('exerciseTitle', data.studentExerciseLabel || data.exerciseTitle || 'Mashq');
      if (data.solutionKey) formData.append('solutionKey', data.solutionKey);
      if (data.methodologyNotes || data.notes) {
        formData.append('methodologyNotes', data.methodologyNotes || data.notes || '');
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
      const res = await fetch(`${API_BASE}/content/answers/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Javob yuklashda xatolik: ${err}`);
      }
      const uploaded = await res.json();
      imageUrl = uploaded?.imageUrl;
    }

    return this.createAnswerMapping({
      gradeId: data.gradeId || 7,
      subjectId: data.subjectId || 'sub_eng_7',
      studentExerciseLabel: data.studentExerciseLabel || data.exerciseTitle || 'Mashq',
      studentPageNumber: data.studentPageNumber || 1,
      teacherPageNumber: data.teacherPageNumber || 1,
      teacherExerciseLabel:
        data.teacherExerciseLabel || `${data.studentExerciseLabel || 'Mashq'} (Javoblar Kaliti)`,
      solutionKey: data.solutionKey || (imageUrl ? '📸 Skrinshot rasm biriktirilgan' : 'Yechim'),
      notes: data.notes || data.methodologyNotes || data.solutionKey,
      imageUrl: imageUrl || null,
      format: file ? (data.solutionKey ? 'BOTH' : 'IMAGE') : 'TEXT',
    });
  },

  async updateAnswerMapping(id: string, data: any) {
    return fetchJson<any>(`/answer-mappings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteAnswerMapping(id: string) {
    return fetchJson<any>(`/answer-mappings/${id}`, {
      method: 'DELETE',
    });
  },

  async importAnswerMappingsCsv(gradeId: number, subjectId: string, csvContent: string) {
    return fetchJson<any>('/answer-mappings/import-csv', {
      method: 'POST',
      body: JSON.stringify({ gradeId, subjectId, csvContent }),
    });
  },

  async exportAnswerMappingsCsv(gradeId: number, subjectId: string) {
    const res = await fetch(`${API_BASE}/answer-mappings/export-csv?gradeId=${gradeId}&subjectId=${subjectId}`);
    return res.text();
  },

  // Users & Devices
  async getUsers(search?: string) {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return fetchJson<any[]>(`/admin/users${qs}`);
  },

  async disconnectDevice(userId: string, deviceId: string) {
    return fetchJson<any>(`/admin/users/${userId}/devices/${deviceId}`, {
      method: 'DELETE',
    });
  },

  async toggleUserBlock(userId: string, isBlocked: boolean) {
    return fetchJson<any>(`/admin/users/${userId}/block`, {
      method: 'PATCH',
      body: JSON.stringify({ isBlocked }),
    });
  },

  // Audit Logs
  async getAuditLogs(limit?: number) {
    const qs = limit ? `?limit=${limit}` : '';
    return fetchJson<any[]>(`/admin/audit-logs${qs}`);
  },

  // Database Management
  async resetDatabase() {
    return fetchJson<{ success: boolean; message: string }>('/admin/dashboard/reset-database', {
      method: 'POST',
    });
  },
};
