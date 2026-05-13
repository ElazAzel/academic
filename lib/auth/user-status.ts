export function isActiveUserStatus(status: string | null | undefined) {
  return status?.toLowerCase() === "active";
}
