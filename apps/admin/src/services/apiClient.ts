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

  // Content & Ingestion Studio
  async getBooksByGrade(gradeId: number) {
    return fetchJson<any[]>(`/content/grades/${gradeId}/books`);
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
};
