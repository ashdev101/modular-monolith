export interface UpdateStockCommand {
  productId:   string;
  productName: string;
  unitPrice:   number;
}

export interface UpdateStockResult {
  productId:   string;
  productName: string;
  unitPrice:   number;
  quantity:    number;
}

export interface IUpdateStockUseCase {
  execute(cmd: UpdateStockCommand): Promise<UpdateStockResult>;
}
