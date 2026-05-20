export { withQueryFallback } from "./shared";
export { getStudentDashboard } from "./student";
export { getCuratorDashboard, getCuratorStudents, getCuratorQuestions, getCuratorStudentAnalytics, type CuratorDashboardData, type CuratorStudentItem } from "./curator";
export { getAdminDashboard, getAdminStudentAnalytics, getEnrollmentData } from "./admin";
export { getInstructorDashboard, getInstructorAnalytics, getForwardedQuestions, getInstructorStudents } from "./instructor";
export { getSuperCuratorDashboard, getSuperCuratorQuestions, getSuperCuratorStudentAnalytics, type SuperCuratorDashboardData } from "./super-curator";
export { getCustomerObserverDashboard } from "./observer";
