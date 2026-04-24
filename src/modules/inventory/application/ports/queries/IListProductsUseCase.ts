export interface StockSummaryView {
  productId:      string;
  productName:    string;
  unitPriceCents: number;
  quantity:       number;
  isAvailable:    boolean;
}

export interface IListProductsUseCase {
  execute(): Promise<StockSummaryView[]>;
}
