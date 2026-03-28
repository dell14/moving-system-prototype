import { Client, OperationsManager, User } from "@/src/classes";
import type { User as DbUser, UserRole } from "@/src/mockDb/types";
import {
  ensureDate,
  joinName,
  parseNumericId,
  splitName,
  usernameFromEmail,
} from "@/src/classes/shared/utils";

function defaultUserRoleForModel(model: User): UserRole {
  if (model instanceof OperationsManager) return "manager";
  return "customer";
}

export function toDomainUser(record: DbUser): User {
  const nameParts = splitName(record.name);
  const baseProps = {
    recordId: record.id,
    userId: record.userId || parseNumericId(record.id),
    username: record.username || usernameFromEmail(record.email),
    accountStatus: record.accountStatus || "active",
    passwordHash: record.passwordHash || record.password,
    createdDate: ensureDate(record.createdDateISO),
    firstName: record.firstName || nameParts.firstName,
    lastName: record.lastName || nameParts.lastName,
    email: record.email,
    phoneNumber: record.phoneNumber || 0,
  };

  if (record.role === "manager" || record.role === "owner") {
    return new OperationsManager({
      ...baseProps,
      managerPermissions: record.managerPermissions ?? true,
      salary: record.salary ?? 0,
    });
  }

  return new Client({
    ...baseProps,
    preferredNotificationChannel: record.preferredNotificationChannel ?? "email",
    numberOfServiceRequests: record.numberOfServiceRequests ?? 0,
  });
}

export function toDbUser(model: User, template?: DbUser): DbUser {
  const fullName = joinName(model.firstName, model.lastName);
  const baseRecord: DbUser = {
    id:
      model.recordId ??
      template?.id ??
      `user_${model.userId || Math.floor(Date.now() / 1000)}`,
    userId: model.userId || template?.userId || parseNumericId(template?.id ?? "0"),
    username: model.username || usernameFromEmail(model.email),
    accountStatus: model.accountStatus || "active",
    passwordHash: model.passwordHash,
    createdDateISO: model.createdDate.toISOString(),
    firstName: model.firstName,
    lastName: model.lastName,
    email: model.email,
    phoneNumber: model.phoneNumber || 0,
    password: model.passwordHash,
    name: fullName,
    role: template?.role ?? defaultUserRoleForModel(model),
    preferredNotificationChannel: template?.preferredNotificationChannel,
    numberOfServiceRequests: template?.numberOfServiceRequests,
    managerPermissions: template?.managerPermissions,
    salary: template?.salary,
  };

  if (model instanceof Client) {
    baseRecord.preferredNotificationChannel = model.preferredNotificationChannel;
    baseRecord.numberOfServiceRequests = model.numberOfServiceRequests;
  }

  if (model instanceof OperationsManager) {
    baseRecord.managerPermissions = model.managerPermissions;
    baseRecord.salary = model.salary;
  }

  return baseRecord;
}
