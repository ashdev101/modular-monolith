export interface DeactivateDiscountCommand {
  code: string;
}

export interface IDeactivateDiscountUseCase {
  execute(cmd: DeactivateDiscountCommand): Promise<void>;
}
