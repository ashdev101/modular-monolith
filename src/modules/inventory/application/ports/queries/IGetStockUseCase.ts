export interface GetStockQuery {
  productId: string;
}

export interface StockView {
  productId:      string;
  productName:    string;
  unitPriceCents: number;
  quantity:       number;
  isAvailable:    boolean;
}

export interface IGetStockUseCase {
  execute(query: GetStockQuery): Promise<StockView>;
}
