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

export interface WeeklyCohortRow {
  cohortName: string;
  course: string;
  periodStart: string;
  periodEnd: string;
  weekNumber: number;
  totalStudents: number;
  activeStudents: number;
  activePercent: number;
  moduleProgressPercent: number;
  completedWeekCount: number;
  completedWeekPercent: number;
  behindCount: number;
  behindPercent: number;
  criticalRisks: number;
  totalQuestions: number;
  avgResponseTimeHours: number;
  submittedAssignments: number;
  avgAssignmentScore: number;
  currentModule: string;
}

export interface WeeklyCohortRiskRow {
  studentName: string;
  email: string;
  riskType: string;
  severity: string;
  action: string;
  status: string;
}

export interface WeeklyCohortQuestionRow {
  studentName: string;
  email: string;
  question: string;
  answer: string;
  responseTimeHours: number;
}

export interface WeeklyCohortModuleRow {
  moduleName: string;
  completionPercent: number;
  avgTestScore: number;
  assignmentSubmittedPercent: number;
}

// ── Final Cohort Report types ─────────────────────────────────────────

export interface FinalCohortRow {
  cohortName: string;
  course: string;
  periodStart: string;
  periodEnd: string;
  totalEnrolled: number;
  completedCount: number;
  completedPercent: number;
  finalProjectSubmitted: number;
  finalProjectPercent: number;
  certificatesIssued: number;
  certificatesPercent: number;
  avgProductivityScore: number;
  avgTestScore: number;
  avgAssignmentScore: number;
  avgFinalProjectScore: number;
  satisfactionScore: number;
  nps: number;
  automatedTasksCount: number;
}

export interface FinalCohortScoreDistributionRow {
  level: string;
  count: number;
  percent: number;
}

export interface FinalCohortGraduateRow {
  studentName: string;
  email: string;
  productivityScore: number;
  level: string;
  finalProjectTitle: string;
  certificateStatus: string;
}

export interface FinalCohortRiskSummaryRow {
  riskType: string;
  totalCount: number;
  resolvedCount: number;
  unresolvedCount: number;
}

export interface FinalCohortSatisfactionRow {
  metric: string;
  value: string;
}

export interface ProductivityScoreRow {
  studentName: string;
  email: string;
  course: string;
  cohort: string;
  totalScore: number;
  level: string;
  /** Tests component score 0–100 */
  testsScore: number;
  /** Assignments component score 0–100 */
  assignmentsScore: number;
  /** Final project component score 0–100 */
  finalProjectScore: number;
  /** Activity component score 0–100 */
  activityScore: number;
  /** Diagnostics component score 0–100 (usually N/A) */
  diagnosticsScore: number;
}

export interface ReportDataScope {
  studentIds?: string[];
  courseIds?: string[];
  cohortIds?: string[];
  curatorIds?: string[];
}

export type ReportFormat = "csv" | "xlsx" | "pdf";
export type ReportType = "progress" | "risk" | "assignments" | "certificates" | "curator_workload" | "productivity_score" | "weekly_cohort" | "final_cohort";
