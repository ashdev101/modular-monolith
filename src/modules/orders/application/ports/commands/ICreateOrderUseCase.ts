import { v4 as uuidv4 } from 'uuid';
import type { ICommand } from '../../../../../core/bus/CommandBus';

export interface CreateOrderItem {
  productId: string;
  quantity:  number;
}

export class CreateOrderCommand implements ICommand {
  public readonly correlationId: string;
  public readonly causationId:   string;

  constructor(
    public readonly customerId:    string,
    public readonly items:         CreateOrderItem[],
    public readonly discountCode?: string,
    correlationId?:                string,
  ) {
    this.correlationId = correlationId ?? uuidv4();
    this.causationId   = this.correlationId;
  }
}

export interface CreateOrderResult {
  orderId:     string;
  total:       number;
  currency:    string;
  discountPct: number;
  status:      string;
}

export interface ICreateOrderUseCase {
  execute(cmd: CreateOrderCommand): Promise<CreateOrderResult>;
}
