type EmployeeProps = {
  employeeId: number;
  name: string;
  role: string;
  availability?: boolean;
};

export class Employee {
  public employeeId: number;
  public name: string;
  public role: string;
  public availability: boolean;

  constructor(props: EmployeeProps) {
    this.employeeId = props.employeeId;
    this.name = props.name;
    this.role = props.role;
    this.availability = props.availability ?? true;
  }

  assignToSlot(): void {
    this.availability = false;
  }

  checkAvailability(): boolean {
    return this.availability;
  }
}
