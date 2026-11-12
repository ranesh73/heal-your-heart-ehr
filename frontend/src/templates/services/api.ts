import {
  ClinicalTemplate,
  MedicalCondition,
  MedicationReference,
  ConsultationRecord,
  Patient,
  TemplateFormValues,
  UserSession
} from '../types';

const API_BASE = '/api';

/**
 * Turn a failed response into a message that is safe and useful to show the
 * user. The backend returns `{ error, message }` for API failures and never
 * leaks a stack trace, so we prefer its wording and fall back to a generic
 * line if the body is not JSON (proxy down, HTML error page, etc.).
 */
async function toApiError(res: Response, fallback: string): Promise<Error> {
  try {
    const body = await res.json();
    const detail = body?.message || body?.error;
    if (detail) return new Error(String(detail));
  } catch {
    /* non-JSON body - fall through to the generic message */
  }
  return new Error(fallback);
}

async function request<T>(url: string, init: RequestInit | undefined, fallback: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error('Cannot reach the server. Please check that the backend is running.');
  }
  if (!res.ok) throw await toApiError(res, fallback);
  return res.json() as Promise<T>;
}

const jsonPost = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

const jsonPut = (body: unknown): RequestInit => ({
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

export const api = {
  // ---------------------------------------------------------------- Auth
  async login(email: string, password?: string): Promise<{ success: boolean; user: UserSession; token: string }> {
    return request(`${API_BASE}/auth/login`, jsonPost({ email, password }), 'Failed to login');
  },

  async signup(userData: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    role?: string;
  }): Promise<{ success: boolean; user: UserSession; token: string }> {
    return request(`${API_BASE}/auth/signup`, jsonPost(userData), 'Failed to create account');
  },

  /** Starts password recovery. Succeeds whether or not the email is known. */
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    return request(
      `${API_BASE}/auth/forgot-password`,
      jsonPost({ email }),
      'Failed to send the password reset link'
    );
  },

  /** Finishes password recovery by setting the account's new password. */
  async resetPassword(
    email: string,
    password: string,
    confirmPassword: string
  ): Promise<{ success: boolean; message: string }> {
    return request(
      `${API_BASE}/auth/reset-password`,
      jsonPost({ email, password, confirm_password: confirmPassword }),
      'Failed to reset the password'
    );
  },

  async getCurrentUser(): Promise<UserSession> {
    return request(`${API_BASE}/auth/current-user`, undefined, 'Failed to load the current user');
  },

  // ----------------------------------------------------------- Reference
  async getTemplateTypes(): Promise<string[]> {
    return request(`${API_BASE}/template-types`, undefined, 'Failed to load template types');
  },

  async getTemplateCategories(): Promise<string[]> {
    return request(`${API_BASE}/template-categories`, undefined, 'Failed to load categories');
  },

  async getMedicalConditions(): Promise<MedicalCondition[]> {
    return request(`${API_BASE}/medical-conditions`, undefined, 'Failed to load medical conditions');
  },

  async getSpecialties(): Promise<string[]> {
    return request(`${API_BASE}/specialties`, undefined, 'Failed to load specialties');
  },

  // ----------------------------------------------------------- Templates
  async getTemplates(params: {
    tab?: string;
    template_type?: string;
    category?: string;
    specialty?: string;
    condition?: string;
    search?: string;
    status?: string;
    owner?: string;
  } = {}): Promise<ClinicalTemplate[]> {
    const query = new URLSearchParams();
    if (params.tab) query.set('tab', params.tab);
    if (params.template_type && params.template_type !== 'All') query.set('template_type', params.template_type);
    if (params.category && params.category !== 'All') query.set('category', params.category);
    if (params.specialty && params.specialty !== 'All') query.set('specialty', params.specialty);
    if (params.condition) query.set('condition', params.condition);
    if (params.search) query.set('search', params.search);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.owner) query.set('owner', params.owner);

    return request(`${API_BASE}/templates?${query.toString()}`, undefined, 'Failed to load templates');
  },

  async getTemplate(id: number): Promise<ClinicalTemplate> {
    return request(`${API_BASE}/templates/${id}`, undefined, `Template #${id} could not be loaded`);
  },

  async createTemplate(templateData: Partial<ClinicalTemplate> | TemplateFormValues): Promise<{ success: boolean; id: number; message: string }> {
    return request(`${API_BASE}/templates`, jsonPost(templateData), 'Failed to create template');
  },

  async updateTemplate(id: number, templateData: Partial<ClinicalTemplate> | Partial<TemplateFormValues>): Promise<{ success: boolean; message: string }> {
    return request(`${API_BASE}/templates/${id}`, jsonPut(templateData), 'Failed to update template');
  },

  async setTemplateStatus(id: number, isActive: boolean): Promise<{ success: boolean; is_active: boolean; message: string }> {
    return request(`${API_BASE}/templates/${id}/status`, jsonPut({ is_active: isActive }), 'Failed to change template status');
  },

  async deleteTemplate(id: number): Promise<{ success: boolean; message: string }> {
    return request(`${API_BASE}/templates/${id}`, { method: 'DELETE' }, 'Failed to delete template');
  },

  async duplicateTemplate(id: number): Promise<{ success: boolean; id: number; name: string; message: string }> {
    return request(`${API_BASE}/templates/${id}/duplicate`, { method: 'POST' }, 'Failed to duplicate template');
  },

  async shareTemplate(id: number): Promise<{ success: boolean; message: string }> {
    return request(`${API_BASE}/templates/${id}/share`, { method: 'POST' }, 'Failed to share template');
  },

  async importTemplate(id: number): Promise<{ success: boolean; message: string }> {
    return request(`${API_BASE}/templates/${id}/import`, { method: 'POST' }, 'Failed to import template');
  },

  // Alias for importTemplate
  async importLibraryTemplate(id: number): Promise<{ success: boolean; message: string }> {
    return this.importTemplate(id);
  },

  async updateRoles(id: number, roles: string[]): Promise<{ success: boolean; message: string }> {
    return request(`${API_BASE}/templates/${id}/roles`, jsonPut({ roles }), 'Failed to update template roles');
  },

  // Alias for updateRoles
  async assignRoles(id: number, roles: string[]): Promise<{ success: boolean; message: string }> {
    return this.updateRoles(id, roles);
  },

  async updateDefaultValues(id: number, defaults: Record<string, string>): Promise<{ success: boolean; message: string }> {
    return request(`${API_BASE}/templates/${id}/default-values`, jsonPut({ defaults }), 'Failed to update default values');
  },

  // Alias for updateDefaultValues
  async saveDefaultValues(id: number, defaults: Record<string, string>): Promise<{ success: boolean; message: string }> {
    return this.updateDefaultValues(id, defaults);
  },

  // -------------------------------------------------------------- Search
  async searchTemplates(q: string): Promise<ClinicalTemplate[]> {
    return request(`${API_BASE}/search/templates?q=${encodeURIComponent(q)}`, undefined, 'Search failed');
  },

  // ------------------------------------------------------------ Patients
  async getPatients(): Promise<Patient[]> {
    return request(`${API_BASE}/patients`, undefined, 'Failed to fetch patients');
  },

  async getPatient(id: number): Promise<Patient> {
    return request(`${API_BASE}/patients/${id}`, undefined, 'Failed to fetch patient details');
  },

  // ------------------------------------------- Consultations & Responses
  async saveConsultation(data: {
    patient_id: number;
    template_id: number;
    doctor_name?: string;
    notes?: string;
    encounter_type?: string;
    status?: string;
    responses: Array<{ component_id: number; component_label: string; response_value: string }>;
  }): Promise<{ success: boolean; consultation_id: number; message: string }> {
    return request(`${API_BASE}/responses`, jsonPost(data), 'Failed to save consultation responses');
  },

  async updateConsultation(id: number, data: {
    patient_id?: number;
    notes?: string;
    encounter_type?: string;
    status?: string;
    responses?: Array<{ component_id: number; component_label: string; response_value: string }>;
  }): Promise<{ success: boolean; message: string }> {
    return request(`${API_BASE}/consultations/${id}`, jsonPut(data), 'Failed to update consultation');
  },

  async getConsultation(id: number): Promise<ConsultationRecord> {
    return request(`${API_BASE}/responses/${id}`, undefined, 'Failed to fetch consultation');
  },

  async getConsultations(params: { patient_id?: number; template_id?: number } = {}): Promise<ConsultationRecord[]> {
    const query = new URLSearchParams();
    if (params.patient_id) query.set('patient_id', String(params.patient_id));
    if (params.template_id) query.set('template_id', String(params.template_id));
    return request(`${API_BASE}/consultations?${query.toString()}`, undefined, 'Failed to list consultations');
  },

  // ------------------------------------------ Common Medication Catalog
  async getMedications(params: { condition_key?: string; category?: string; search?: string } = {}): Promise<MedicationReference[]> {
    const query = new URLSearchParams();
    if (params.condition_key) query.set('condition_key', params.condition_key);
    if (params.category) query.set('category', params.category);
    if (params.search) query.set('search', params.search);
    return request(`${API_BASE}/medications?${query.toString()}`, undefined, 'Failed to fetch medications');
  },

  async saveMedication(med: Partial<MedicationReference>): Promise<{ success: boolean; id: number; message: string }> {
    return request(`${API_BASE}/medications`, jsonPost(med), 'Failed to save medication entry');
  },

  async updateMedication(id: number, med: Partial<MedicationReference>): Promise<{ success: boolean; message: string }> {
    return request(`${API_BASE}/medications/${id}`, jsonPut(med), 'Failed to update medication entry');
  },

  async deleteMedication(id: number): Promise<{ success: boolean; message: string }> {
    return request(`${API_BASE}/medications/${id}`, { method: 'DELETE' }, 'Failed to delete medication entry');
  }
};
