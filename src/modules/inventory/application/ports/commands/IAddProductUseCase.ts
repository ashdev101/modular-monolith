export interface AddProductCommand {
  productName: string;
  unitPrice:   number;
  quantity:    number;
}

export interface AddProductResult {
  productId:   string;
  productName: string;
  unitPrice:   number;
  quantity:    number;
}

export interface IAddProductUseCase {
  execute(cmd: AddProductCommand): Promise<AddProductResult>;
}
