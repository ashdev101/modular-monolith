import { v4 as uuidv4 } from 'uuid';
import type { ICommand } from '../../../../../core/bus/CommandBus';

export class CancelOrderCommand implements ICommand {
  public readonly correlationId: string;
  public readonly causationId:   string;

  constructor(
    public readonly orderId:   string,
    public readonly reason:    string,
    correlationId?:            string,
  ) {
    this.correlationId = correlationId ?? uuidv4();
    this.causationId   = this.correlationId;
  }
}

export interface CancelOrderResult {
  orderId: string;
  status:  string;
}

export interface ICancelOrderUseCase {
  execute(cmd: CancelOrderCommand): Promise<CancelOrderResult>;
}
