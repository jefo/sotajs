import type { Port } from './di.v2';

// The definition of a feature, which is a record of ports.
export type FeatureDef = Record<string, Port<any>>;

/**
 * Defines a feature by grouping its ports.
 * This function is primarily used for type inference and structuring the application.
 * @param ports - An object containing the feature's ports.
 * @returns The feature definition.
 */
export const defineFeature = <TDef extends FeatureDef>(ports: TDef): TDef => {
  return ports;
};

type PortFn = (...args: any[]) => any;

type AdapterFn<T extends PortFn> = (...args: Parameters<T>) => Promise<ReturnType<T>>;

/**
 * A type helper to extract the port signatures from a feature definition,
 * creating a type that an adapter class must implement.
 */
export type FeaturePorts<T extends FeatureDef> = {
  [K in keyof T]: T[K] extends Port<infer U> ? AdapterFn<U> : never;
};