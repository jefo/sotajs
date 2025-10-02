import { setPortAdapter, Port } from './di.v2';
import type { FeatureDef, FeaturePorts } from './feature';

// The return type of defineFeature is FeatureDef
type DefinedFeature = FeatureDef;

// A map of feature names to their definitions
type FeaturesMap = Record<string, DefinedFeature>;

// The type for an adapter class constructor. The class must implement the feature definition.
type AdapterClass<T extends DefinedFeature> = new () => FeaturePorts<T>;

// The binder object for a single feature
type FeatureBinder<T extends DefinedFeature> = {
  bind: (adapterClass: AdapterClass<T>) => void;
};

// The object passed to the user's binder function in `bindFeatures`
type FeatureBinders<TFeatures extends FeaturesMap> = {
  [K in keyof TFeatures]: FeatureBinder<TFeatures[K]>;
};

/**
 * Defines the application core by collecting all its features.
 * @param features - A map of feature names to their definitions created by `defineFeature`.
 * @returns A core object with a `bindFeatures` method for composition.
 */
export const defineCore = <TFeatures extends FeaturesMap>(features: TFeatures) => {
  const binders: any = {};

  // Create a binder for each feature
  for (const key in features) {
    const featureDef = features[key];
    binders[key] = {
      bind: (Adapter: AdapterClass<typeof featureDef>) => {
        const implementation = new Adapter();
        for (const portName in featureDef) {
          const port = featureDef[portName];
          const adapterMethod = (implementation as any)[portName];

          if (typeof adapterMethod !== 'function') {
            throw new Error(`Adapter class for feature '${key}' is missing method '${portName}'.`);
          }

          // Bind the method to its instance to preserve `this` context
          const boundAdapter = adapterMethod.bind(implementation);
          setPortAdapter(port, boundAdapter);
        }
      }
    };
  }

  const core = {
    /**
     * Binds concrete adapter implementations to the features defined in the core.
     * @param binderFunc - A function that receives an object of feature binders.
     */
    bindFeatures: (binderFunc: (featureBinders: FeatureBinders<TFeatures>) => void) => {
      binderFunc(binders);
    }
  };

  return core;
};