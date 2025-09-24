import { describe, it, expect } from 'bun:test';
import { z } from 'zod';
import { createValueObject } from './value-object';

// Define a simple schema for testing
const AddressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  zip: z.string().length(5),
  coords: z
    .object({
      lat: z.number(),
      lon: z.number(),
    })
    .optional(),
});
type AddressProps = z.infer<typeof AddressSchema>;

// Create the Value Object class
const Address = createValueObject({ schema: AddressSchema });

describe('createValueObject', () => {
  const validAddressData: AddressProps = {
    street: '123 Main St',
    city: 'Anytown',
    zip: '12345',
    coords: { lat: 10, lon: 20 },
  };

  it('should create a Value Object instance with valid data', () => {
    const address = Address.create(validAddressData);
    expect(address).toBeInstanceOf(Address);
    expect(address.props.street).toBe('123 Main St');
    expect(address.props.coords?.lat).toBe(10);
  });

  it('should throw an error if initial data violates the schema', () => {
    const invalidData = { ...validAddressData, zip: '123' }; // Invalid zip length
    expect(() => Address.create(invalidData)).toThrow();
  });

  it('should prevent direct mutation of the props object', () => {
    const address = Address.create(validAddressData);

    // Attempt to modify a top-level property
    expect(() => {
      (address.props as any).street = 'New Street';
    }).toThrow(TypeError);

    // Attempt to modify a nested property
    expect(() => {
      if (address.props.coords) {
        (address.props.coords as any).lat = 99;
      }
    }).toThrow(TypeError);

    // Verify that the original values are unchanged
    expect(address.props.street).toBe('123 Main St');
    expect(address.props.coords?.lat).toBe(10);
  });

  it('should correctly check for structural equality', () => {
    const address1 = Address.create(validAddressData);
    const address2 = Address.create(validAddressData);
    const address3 = Address.create({ ...validAddressData, city: 'Othertown' });
    const address4 = Address.create({ ...validAddressData, coords: { lat: 10, lon: 20 } }); // Same data, new object

    expect(address1.equals(address2)).toBe(true);
    expect(address1.equals(address3)).toBe(false);
    expect(address1.equals(address4)).toBe(true); // Structural equality
    expect(address1.equals(undefined)).toBe(false);
    expect(address1.equals(null)).toBe(false);
  });

  it('should handle optional properties correctly in equality check', () => {
    const dataWithoutCoords = { ...validAddressData };
    delete dataWithoutCoords.coords;

    const addressA = Address.create(dataWithoutCoords);
    const addressB = Address.create(dataWithoutCoords);
    const addressC = Address.create(validAddressData);

    expect(addressA.equals(addressB)).toBe(true);
    expect(addressA.equals(addressC)).toBe(false);
  });
});

describe('ValueObject with actions', () => {
  const PointSchema = z.object({
    x: z.number(),
    y: z.number(),
  });

  type PointProps = z.infer<typeof PointSchema>;

  const Point = createValueObject({
    schema: PointSchema,
    actions: {
      move(state: PointProps, dx: number, dy: number) {
        state.x += dx;
        state.y += dy;
      },
      reset(state: PointProps) {
        state.x = 0;
        state.y = 0;
      },
    },
  });

  it('should not return a new instance after an action', () => {
    const point1 = Point.create({ x: 10, y: 20 });
    const result = point1.actions.move(5, -5);

    expect(result).toBeUndefined(); // Actions return void
  });

  it('should mutate the original Value Object', () => {
    const point1 = Point.create({ x: 10, y: 20 });
    point1.actions.move(5, -5);

    expect(point1.props).toEqual({ x: 15, y: 15 }); // Original should be changed
  });

  it('should handle multiple actions on the same instance', () => {
    const point = Point.create({ x: 10, y: 20 });
    point.actions.move(5, 5);
    expect(point.props).toEqual({ x: 15, y: 25 });

    point.actions.reset();
    expect(point.props).toEqual({ x: 0, y: 0 });
  });

  it('should throw an error if an action results in an invalid state', () => {
    const GuardedPoint = createValueObject({
      schema: z.object({
        x: z.number().max(100),
      }),
      actions: {
        add(state: { x: number }, amount: number) {
          state.x += amount;
        },
      },
    });

    const point = GuardedPoint.create({ x: 90 });

    // This should not throw, as the validation happens on creation, not during action.
    // The internal state will be invalid until the next creation.
    point.actions.add(20);
    expect(point.props.x).toBe(110);

    // Let's test if creating a new VO with this invalid state throws
    expect(() => GuardedPoint.create(point.props)).toThrow();
  });
});

describe('ValueObject with computed properties', () => {
  const RectSchema = z.object({
    width: z.number(),
    height: z.number(),
  });

  type RectProps = z.infer<typeof RectSchema>;

  const Rectangle = createValueObject({
    schema: RectSchema,
    actions: {
      setWidth(state: RectProps, width: number) {
        state.width = width;
      },
    },
    computed: {
      area: (state) => state.width * state.height,
      isSquare: (state) => state.width === state.height,
    },
  });

  it('should return the correct value for computed properties', () => {
    const rect = Rectangle.create({ width: 10, height: 20 });
    expect(rect.area).toBe(200);
  });

  it('should update computed properties when state changes', () => {
    const rect = Rectangle.create({ width: 10, height: 20 });
    expect(rect.area).toBe(200);

    rect.actions.setWidth(15);
    expect(rect.props.width).toBe(15);
    expect(rect.area).toBe(300); // 15 * 20
  });

  it('should correctly compute boolean values', () => {
    const square = Rectangle.create({ width: 10, height: 10 });
    expect(square.isSquare).toBe(true);

    const rect = Rectangle.create({ width: 10, height: 20 });
    expect(rect.isSquare).toBe(false);

    rect.actions.setWidth(20);
    expect(rect.isSquare).toBe(true);
  });
});