export interface DeleteCustomerCommand {
  customerId: string;
}

export interface IDeleteCustomerUseCase {
  execute(cmd: DeleteCustomerCommand): Promise<void>;
}
