// ─────────────────────────────────────────────────────────────────────────────
// EventBus.ts — backward-compat barrel.
//
// All concrete implementations have moved to their own files:
//   IEventBus          → ./IEventBus
//   InMemoryEventBus   → ./InMemoryEventBus
//   AzureServiceBusEventBus → ./AzureServiceBusEventBus
//   createEventBus     → ./createEventBus
//
// Existing imports like:
//   import { InMemoryEventBus } from '.../core/bus/EventBus'
//   import type { IEventBus }   from '.../core/bus/EventBus'
// still work through this file.
// ─────────────────────────────────────────────────────────────────────────────

export type { IEventBus, IEventHandler } from './IEventBus';
export { InMemoryEventBus }              from './InMemoryEventBus';
export { AzureServiceBusEventBus }       from './AzureServiceBusEventBus';
export { createEventBus }               from './createEventBus';
export type { EventBusConfig, EventBusProvider } from './createEventBus';
