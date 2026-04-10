import type { User as DbUser } from "@/src/mockDb/types";
import { Client } from "..";
import { toDomainUser } from "@/src/mappers";

type AccountServiceProps = {
  serviceId: number;
  maxLoginAttempts?: number;
  users?: DbUser[];
};

export class AccountService {
  public serviceId: number;
  public maxLoginAttempts: number;
  private users: DbUser[];

  constructor(props: AccountServiceProps) {
    this.serviceId = props.serviceId;
    this.maxLoginAttempts = Math.max(1, Math.trunc(props.maxLoginAttempts ?? 5));
    this.users = props.users ?? [];
  }

  setUsers(users: DbUser[]): void {
    this.users = users;
  }

  login(username: string, password: string): boolean {
    return this.authenticate(username, password);
  }

  authenticate(username: string, password: string): boolean {
    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername || !password.trim()) return false;

    const userRecord = this.users.find(
      (user) =>
        user.username.trim().toLowerCase() === normalizedUsername ||
        user.email.trim().toLowerCase() === normalizedUsername,
    );
    if (!userRecord) return false;

    return toDomainUser(userRecord).login(password);
  }

  requestPasswordRecovery(email: string): boolean {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return false;
    return this.users.some(
      (user) => user.email.trim().toLowerCase() === normalizedEmail,
    );
  }

  resetPassword(newPassword: string): boolean {
    return newPassword.trim().length > 0;
  }

  submitRegistrationForm(userData: string): boolean {
    return userData.trim().length > 0;
  }

  createUserAccount(userData: string) {
    const normalized = userData.trim();
    const email = normalized.includes("@") ? normalized : `${normalized}@example.com`;
    const baseUser = {
      recordId: undefined,
      userId: 0,
      username: email.split("@")[0] || "user",
      accountStatus: "inactive",
      passwordHash: "",
      createdDate: new Date(),
      firstName: "New",
      lastName: "User",
      email,
      phoneNumber: 0,
    };

    return new Client({
      ...baseUser,
      preferredNotificationChannel: "email",
      numberOfServiceRequests: 0,
    });
  }

  registerUser(): void {}

  activateAccount(): void {}

  activateAccountUser(userId: number): void {
    const userRecord = this.users.find((user) => user.userId === userId);
    if (!userRecord) return;
    const userModel = toDomainUser(userRecord);
    userModel.activate();
  }
}
