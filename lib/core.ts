import { setPortAdapter } from './di.v2';
import type { FeatureDef, FeaturePorts } from './feature';

// A map of feature names to their definitions
type FeaturesMap = Record<string, FeatureDef>;

// The type for an adapter class constructor
type AdapterClass<T extends FeatureDef> = new () => FeaturePorts<T>;

// The type for the map passed to bindFeatures
type FeatureAdapterMap<TFeatures extends FeaturesMap> = {
  [K in keyof TFeatures]: AdapterClass<TFeatures[K]>;
};

/**
 * Defines the application core by collecting all its features.
 * @param features - A map of feature names to their definitions created by `defineFeature`.
 * @returns A core object with a `bindFeatures` method for composition.
 */
export const defineCore = <TFeatures extends FeaturesMap>(features: TFeatures) => {
  const core = {
    /**
     * Binds concrete adapter implementations to the features defined in the core.
     * @param binder - A callback that receives feature interfaces with bind methods.
     */
    bindFeatures: (binder: (features: {
      [K in keyof TFeatures]: {
        bind(adapterClass: new () => FeaturePorts<TFeatures[K]>): void;
      }
    }) => void) => {
      // Create feature interfaces with bind methods
      const featureInterfaces: any = {};
      for (const key in features) {
        featureInterfaces[key] = {
          bind: (Adapter: new () => any) => {
            const featureDef = features[key as keyof TFeatures];
            const implementation = new Adapter();

            for (const portName in featureDef) {
              const port = featureDef[portName];
              const adapterMethod = (implementation as any)[portName];

              if (typeof adapterMethod !== 'function') {
                throw new Error(`Adapter class for feature '${String(key)}' is missing method '${portName}'.`);
              }

              // Bind the method to its instance to preserve `this` context
              const boundAdapter = adapterMethod.bind(implementation);
              setPortAdapter(port, boundAdapter);
            }
          }
        };
      }

      // Execute the binder callback with feature interfaces
      binder(featureInterfaces);
    }
  };

  return core;
};