import { v4 as uuidv4 } from 'uuid';
import type { IQuery } from '../../../../../core/bus/QueryBus';

export class GetOrderDetailQuery implements IQuery {
  public readonly correlationId: string;
  constructor(public readonly orderId: string, correlationId?: string) {
    this.correlationId = correlationId ?? uuidv4();
  }
}

export interface OrderDetailView {
  orderId:        string;
  status:         string;
  totalCents:     number;
  currency:       string;
  discountCode:   string | null;
  discountPct:    number;
  createdAt:      string;
  customerName:   string;
  customerEmail:  string;
  customerIsVip:  boolean;
  productId:      string;
  productName:    string;
  quantity:       number;
  unitPriceCents: number;
  stockRemaining: number;
}

export interface IGetOrderDetailUseCase {
  execute(query: GetOrderDetailQuery): Promise<OrderDetailView>;
}
