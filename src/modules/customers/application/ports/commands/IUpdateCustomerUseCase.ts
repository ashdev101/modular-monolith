export interface UpdateCustomerCommand {
  customerId: string;
  name:       string;
  email:      string;
}

export interface UpdateCustomerResult {
  id:    string;
  name:  string;
  email: string;
  isVip: boolean;
}

export interface IUpdateCustomerUseCase {
  execute(cmd: UpdateCustomerCommand): Promise<UpdateCustomerResult>;
}
