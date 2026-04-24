export interface GetCustomerQuery {
  customerId: string;
}

export interface CustomerView {
  id:           string;
  name:         string;
  email:        string;
  isVip:        boolean;
  vipGrantedAt: string | null;
  createdAt:    string;
}

export interface IGetCustomerUseCase {
  execute(query: GetCustomerQuery): Promise<CustomerView>;
}
