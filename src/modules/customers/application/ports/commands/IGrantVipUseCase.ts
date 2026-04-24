export interface GrantVipCommand {
  customerId: string;
}

export interface GrantVipResult {
  id:    string;
  isVip: boolean;
}

export interface IGrantVipUseCase {
  execute(cmd: GrantVipCommand): Promise<GrantVipResult>;
}
