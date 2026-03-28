export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export class DomainValidationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = "DomainValidationError";
  }
}

export class DomainPreconditionError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = "DomainPreconditionError";
  }
}
