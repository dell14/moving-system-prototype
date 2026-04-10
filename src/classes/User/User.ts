type UserProps = {
  recordId?: string;
  userId: number;
  username: string;
  accountStatus: string;
  passwordHash: string;
  createdDate: Date;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: number;
  sessionActive?: boolean;
};

export class User {
  public recordId?: string;
  public userId: number;
  public username: string;
  public accountStatus: string;
  public passwordHash: string;
  public createdDate: Date;
  public firstName: string;
  public lastName: string;
  public email: string;
  public phoneNumber: number;
  protected sessionActive: boolean;

  constructor(props: UserProps) {
    this.recordId = props.recordId;
    this.userId = props.userId;
    this.username = props.username;
    this.accountStatus = props.accountStatus;
    this.passwordHash = props.passwordHash;
    this.createdDate = props.createdDate;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.email = props.email;
    this.phoneNumber = props.phoneNumber;
    this.sessionActive = props.sessionActive ?? false;
  }

  login(passwordAttempt: string): boolean {
    if (this.accountStatus !== "active") {
      this.sessionActive = false;
      return false;
    }
    const didAuthenticate = this.authenticate(passwordAttempt);
    this.sessionActive = didAuthenticate;
    return didAuthenticate;
  }

  authenticate(passwordAttempt: string): boolean {
    if (!passwordAttempt.trim()) return false;
    return this.passwordHash === passwordAttempt;
  }

  logout(): void {
    this.sessionActive = false;
  }

  activate(): void {
    this.accountStatus = "active";
  }

  deactivate(): void {
    this.accountStatus = "inactive";
    this.logout();
  }

  resetPassword(newPassword: string): boolean {
    const normalized = newPassword.trim();
    if (!normalized) return false;
    this.passwordHash = normalized;
    this.logout();
    return true;
  }

  isSessionActive(): boolean {
    return this.sessionActive;
  }

  requestNewAccountRegistration(): void {
    this.deactivate();
  }

  displayRegistrationForm(): void {
    this.logout();
  }
}
