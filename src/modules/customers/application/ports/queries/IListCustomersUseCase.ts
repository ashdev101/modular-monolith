export interface CustomerSummaryView {
  id:    string;
  name:  string;
  email: string;
  isVip: boolean;
}

export interface IListCustomersUseCase {
  execute(): Promise<CustomerSummaryView[]>;
}
