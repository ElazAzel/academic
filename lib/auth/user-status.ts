export function isActiveUserStatus(status: string | null | undefined) {
  return status?.toLowerCase() === "active";
  return status?.trim().toLowerCase() === "active";
}
