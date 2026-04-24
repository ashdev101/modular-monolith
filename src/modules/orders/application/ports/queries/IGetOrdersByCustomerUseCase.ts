import { v4 as uuidv4 } from 'uuid';
import type { IQuery } from '../../../../../core/bus/QueryBus';

export class GetOrdersByCustomerQuery implements IQuery {
  public readonly correlationId: string;
  constructor(public readonly customerId: string, correlationId?: string) {
    this.correlationId = correlationId ?? uuidv4();
  }
}

export interface OrderSummaryView {
  orderId:     string;
  status:      string;
  totalCents:  number;
  currency:    string;
  discountPct: number;
  createdAt:   string;
  itemCount:   number;
}

export interface IGetOrdersByCustomerUseCase {
  execute(query: GetOrdersByCustomerQuery): Promise<OrderSummaryView[]>;
}
