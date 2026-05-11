export interface ProgressRow {
  studentName: string;
  email: string;
  course: string;
  cohort: string;
  progressPercent: number;
}

export interface RiskRow {
  studentName: string;
  email: string;
  course: string;
  type: string;
  severity: string;
  status: string;
}

export interface CertificateRow {
  number: string;
  studentName: string;
  email: string;
  course: string;
  issuedAt: string;
}

export interface ReportData<T> {
  title: string;
  filename: string;
  rows: T[];
  grouped: Map<string, T[]>;
  summary: Record<string, number>;
}

export type ReportFormat = "csv" | "xlsx" | "pdf";
