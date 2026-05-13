import { UserAccountStatus } from "@prisma/client";

export function isActiveUserStatus(status: UserAccountStatus | null | undefined) {
  return status === UserAccountStatus.ACTIVE;
}
