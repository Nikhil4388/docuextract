// ── Auth ──────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: 'admin' | 'user' | 'viewer';
  is_verified: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// ── Column Template ───────────────────────────────────────────────────────────
export type DataType = 'text' | 'number' | 'date' | 'boolean';

export interface ColumnDefinition {
  name: string;
  description?: string;
  data_type: DataType;
  extraction_hint?: string;
}

export interface ColumnTemplate {
  id: string;
  name: string;
  description?: string;
  columns: ColumnDefinition[];
  created_at: string;
}

// ── Extraction Job ────────────────────────────────────────────────────────────
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type StorageProvider = 'local' | 's3' | 'google_drive' | 'dropbox';
export type LLMProvider = 'claude' | 'openai';

export interface ExtractionJob {
  id: string;
  name: string;
  status: JobStatus;
  total_files: number;
  processed_files: number;
  failed_files: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

export interface JobCreatePayload {
  name: string;
  template_id: string;
  storage_provider: StorageProvider;
  storage_path?: string;
  storage_credentials?: Record<string, string>;
  llm_provider: LLMProvider;
  llm_model?: string;
  use_user_api_key: boolean;
}

// ── Results ───────────────────────────────────────────────────────────────────
export interface ExtractionResult {
  id: string;
  file_name: string;
  extracted_data?: Record<string, unknown>;
  confidence_scores?: Record<string, number>;
  processing_time_ms?: number;
  error_message?: string;
}

// ── API ───────────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface ApiError {
  detail: string;
}
