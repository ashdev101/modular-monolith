export interface RegisterCustomerCommand {
  name:  string;
  email: string;
}

export interface RegisterCustomerResult {
  id:        string;
  name:      string;
  email:     string;
  isVip:     boolean;
  createdAt: string;
}

export interface IRegisterCustomerUseCase {
  execute(cmd: RegisterCustomerCommand): Promise<RegisterCustomerResult>;
}
