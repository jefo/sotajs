/**
 * Recursively freezes an object and all its properties.
 * @param obj - The object to freeze.
 * @returns The frozen object.
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Freeze the root object
  Object.freeze(obj);

  // Recursively freeze all properties that are objects
  Object.keys(obj).forEach((key) => {
    const prop = (obj as any)[key];
    if (
      prop &&
      typeof prop === 'object' &&
      !Object.isFrozen(prop)
    ) {
      deepFreeze(prop);
    }
  });

  return obj;
}
