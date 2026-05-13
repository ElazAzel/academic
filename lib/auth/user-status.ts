export function isActiveUserStatus(status: string | null | undefined) {
  return status?.trim().toLowerCase() === "active";
}
