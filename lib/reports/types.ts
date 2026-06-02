export interface ProgressRow {
  studentName: string;
  email: string;
  course: string;
  cohort: string;
  progressPercent: number;
  currentModule?: string;
  currentBlock?: string;
  currentLesson?: string;
  lastLoginAt?: string | null;
  avgLessonMinutes?: number;
  riskCount?: number;
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
  status: string;
  revokedAt: string | null;
}

export interface AssignmentRow {
  studentName: string;
  email: string;
  course: string;
  lesson?: string;
  assignment: string;
  status: string;
  score?: number | null;
  submittedAt: string;
  reviewedAt?: string | null;
  reviewerName?: string | null;
}

export interface CuratorWorkloadRow {
  curatorName: string;
  curatorEmail: string;
  cohorts: string;
  studentsCount: number;
  avgProgress: number;
  openQuestions: number;
  pendingAssignments: number;
  activeRisks: number;
  criticalRisks: number;
}

export interface ReportData<T> {
  title: string;
  filename: string;
  rows: T[];
  grouped: Map<string, T[]>;
  summary: Record<string, number>;
}

export interface ReportDataScope {
  studentIds?: string[];
  courseIds?: string[];
  cohortIds?: string[];
  curatorIds?: string[];
}

export type ReportFormat = "csv" | "xlsx" | "pdf";
export type ReportType = "progress" | "risk" | "assignments" | "certificates" | "curator_workload";
