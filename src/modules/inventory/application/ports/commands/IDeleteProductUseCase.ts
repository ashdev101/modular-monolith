export interface DeleteProductCommand {
  productId: string;
}

export interface IDeleteProductUseCase {
  execute(cmd: DeleteProductCommand): Promise<void>;
}
