import { v4 as uuidv4 } from 'uuid';
import type { Request, Response, NextFunction } from 'express';

// Extend Express's Request type so req.requestId is typed everywhere.
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

// Reads x-request-id from the incoming header (set by API gateway / load balancer)
// or generates a new UUID. Echoes it back in x-request-id response header.
// Every downstream log line and every error response body carries this ID.
export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string | undefined) ?? uuidv4();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}
