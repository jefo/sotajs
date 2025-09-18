// Core exports for SotaJS framework
export { createAggregate } from "./lib/aggregate";
export { createEntity } from "./lib/entity";
export { createValueObject } from "./lib/value-object";
export { createBrandedId } from "./lib/branded-id";
export {
	createPort,
	setPortAdapter,
	setPortAdapterWithDependencies,
	usePort,
	resetDI,
} from "./lib/di.v2";
export { deepFreeze } from "./lib/utils";

// Module exports
export { createModule, useModule } from "./lib/module";
export type { Module } from "./lib/module";

// Types exports
export type { AggregateConfig } from "./lib/aggregate";
export type { EntityConfig } from "./lib/entity";

// Utility functions
export { withValidation } from "./lib/validation";
