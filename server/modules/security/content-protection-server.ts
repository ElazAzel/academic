export {
  PROTECTION_SETTINGS,
  getContentProtectionSettings,
  logProtectedContentAccess,
  logSignedUrlIssued,
  logVideoPlaybackIssued,
  logFileDownloadStarted,
  logVisibilityChange,
  logSuspiciousAccess,
  logForbiddenMediaAccess,
  logLockedLessonAccessAttempt,
  detectRepeatedSignedUrlRequests,
  detectCrossDeviceAccessPattern,
} from "./content-protection";

export type { ProtectionLevel, ContentProtectionSettings } from "./content-protection";
