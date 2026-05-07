import { RoleKey } from "@prisma/client";
import type { AppSessionUser } from "@/lib/auth/session";
import { ApiError } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";
import { logAudit } from "@/server/modules/audit/service";

const prisma = getPrisma();

const ALL_ROLE_KEYS = Object.values(RoleKey);
const SUPER_CURATOR_ASSIGNABLE_ROLES: RoleKey[] = [
  RoleKey.student,
  RoleKey.curator,
  RoleKey.instructor,
  RoleKey.customer_observer
];

export function getAssignableRolesForActor(actorRoles: RoleKey[]) {
  if (actorRoles.includes(RoleKey.admin)) {
    return ALL_ROLE_KEYS;
  }
  if (actorRoles.includes(RoleKey.super_curator)) {
    return SUPER_CURATOR_ASSIGNABLE_ROLES;
  }
  return [];
}

export async function listUsers(input: { roleKeys?: RoleKey[]; take?: number } = {}) {
  const take = Math.min(input.take ?? 100, 500);
  return prisma.user.findMany({
    where: input.roleKeys?.length
      ? { roles: { some: { role: { key: { in: input.roleKeys } } } } }
      : undefined,
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      lastLoginAt: true,
      roles: { include: { role: true } }
    }
  });
}

export async function setUserRoles(actor: AppSessionUser, userId: string, roleKeys: RoleKey[]) {
  const assignableRoles = getAssignableRolesForActor(actor.roles);
  if (assignableRoles.length === 0) {
    throw new ApiError("forbidden", "Недостаточно прав для назначения ролей", 403);
  }

  const uniqueRoleKeys = [...new Set(roleKeys)];
  const forbiddenRoles = uniqueRoleKeys.filter((role) => !assignableRoles.includes(role));
  if (forbiddenRoles.length > 0) {
    throw new ApiError("forbidden", "Эти роли может назначить только администратор", 403, { roles: forbiddenRoles });
  }

  if (actor.id === userId && !uniqueRoleKeys.some((role) => role === RoleKey.admin || role === RoleKey.super_curator)) {
    throw new ApiError("forbidden", "Нельзя снять с себя последнюю управляющую роль", 403);
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!targetUser) {
    throw new ApiError("not_found", "Пользователь не найден", 404);
  }

  const roles = await prisma.role.findMany({ where: { key: { in: uniqueRoleKeys } } });
  if (roles.length !== uniqueRoleKeys.length) {
    throw new ApiError("bad_request", "Одна или несколько ролей не найдены", 400);
  }

  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId } }),
    prisma.userRole.createMany({
      data: roles.map((role) => ({ userId, roleId: role.id })),
      skipDuplicates: true
    })
  ]);

  await logAudit({
    actorId: actor.id,
    action: "user.roles_updated",
    entity: "user",
    entityId: userId,
    metadata: { roles: uniqueRoleKeys }
  });

  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      lastLoginAt: true,
      roles: { include: { role: true } }
    }
  });
}
export async function updateUser(actor: AppSessionUser, userId: string, data: { name?: string; email?: string }) {
  const isSelf = actor.id === userId;
  const isAdmin = actor.roles.includes(RoleKey.admin);
  const isSuperCurator = actor.roles.includes(RoleKey.super_curator);

  if (!isAdmin && !isSuperCurator && !isSelf) {
    throw new ApiError("forbidden", "Недостаточно прав для редактирования данных пользователя", 403);
  }

  // Если не админ, проверяем кого редактируем
  if (!isAdmin && !isSelf) {
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } }
    });

    if (!targetUser) {
      throw new ApiError("not_found", "Пользователь не найден", 404);
    }

    const targetRoles = targetUser.roles.map(r => r.role.key);
    
    // Главный куратор может редактировать только определенные роли
    if (isSuperCurator) {
      const hasRestrictedRole = targetRoles.some(role => 
        role === RoleKey.admin || role === RoleKey.super_curator
      );
      if (hasRestrictedRole) {
        throw new ApiError("forbidden", "Главный куратор не может редактировать администраторов или других главных кураторов", 403);
      }
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      lastLoginAt: true,
      roles: { include: { role: true } }
    }
  });

  await logAudit({
    actorId: actor.id,
    action: "user.updated",
    entity: "user",
    entityId: userId,
    metadata: data
  });

  return user;
}

export async function createUser(actor: AppSessionUser, data: { email: string; name?: string; roleKeys: RoleKey[] }) {
  const isAdmin = actor.roles.includes(RoleKey.admin);
  const isSuperCurator = actor.roles.includes(RoleKey.super_curator);

  if (!isAdmin && !isSuperCurator) {
    throw new ApiError("forbidden", "Недостаточно прав для создания пользователя", 403);
  }

  const assignableRoles = getAssignableRolesForActor(actor.roles);
  const forbiddenRoles = data.roleKeys.filter((role) => !assignableRoles.includes(role));
  if (forbiddenRoles.length > 0) {
    throw new ApiError("forbidden", "Недостаточно прав для назначения некоторых ролей", 403, { roles: forbiddenRoles });
  }

  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) {
    throw new ApiError("bad_request", "Пользователь с таким email уже существует", 400);
  }

  const roles = await prisma.role.findMany({ where: { key: { in: data.roleKeys } } });
  
  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      roles: {
        create: roles.map(role => ({ roleId: role.id }))
      }
    },
    include: { roles: { include: { role: true } } }
  });

  await logAudit({
    actorId: actor.id,
    action: "user.created",
    entity: "user",
    entityId: user.id,
    metadata: { email: data.email, roles: data.roleKeys }
  });

  return user;
}

