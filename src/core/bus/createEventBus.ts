import type { IEventBus } from './IEventBus';
import { InMemoryEventBus } from './InMemoryEventBus';
import { AzureServiceBusEventBus } from './AzureServiceBusEventBus';

// ─────────────────────────────────────────────────────────────────────────────
// createEventBus — the ONE place in the entire codebase that knows which
// transport is active.
//
// The rest of the application only sees IEventBus.
// Swapping Azure → AWS SQS → Kafka is a two-step change:
//   1. Implement the new class (IEventBus)
//   2. Add a case here
// Nothing else changes.
//
// Configuration is driven by environment variables validated in env.ts:
//
//   EVENT_BUS_PROVIDER=memory   → InMemoryEventBus (default, no extra config)
//   EVENT_BUS_PROVIDER=azure    → AzureServiceBusEventBus
//                                 requires: AZURE_SERVICE_BUS_CONNECTION_STRING
//
// ─────────────────────────────────────────────────────────────────────────────

export type EventBusProvider = 'memory' | 'azure';

export interface EventBusConfig {
  provider: EventBusProvider;
  /** Required when provider === 'azure' */
  azureConnectionString?: string;
}

export function createEventBus(config: EventBusConfig): IEventBus {
  switch (config.provider) {
    case 'azure': {
      if (!config.azureConnectionString) {
        throw new Error(
          '[createEventBus] EVENT_BUS_PROVIDER=azure requires ' +
          'AZURE_SERVICE_BUS_CONNECTION_STRING to be set.',
        );
      }
      console.log('[createEventBus] Using AzureServiceBusEventBus');
      return new AzureServiceBusEventBus(config.azureConnectionString);
    }

    case 'memory':
    default: {
      console.log('[createEventBus] Using InMemoryEventBus');
      return new InMemoryEventBus();
    }
  }
}
