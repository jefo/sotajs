import { z } from "zod";

// This is a manual way to create a branded type, similar to what Zod's .brand() does.
// We use this to avoid some TypeScript inference issues.
type BrandType<T extends string> = { __brand: T };

/**
 * A higher-order function that creates a strongly-typed, branded ID class.
 * This utility helps ensure that you cannot accidentally mix up different types of IDs
 * (e.g., passing a `ProductId` where a `UserId` is expected).
 *
 * @param brand - A unique string literal to serve as the brand.
 * @returns A class for the branded ID.
 */
export const createBrandedId = <Brand extends string>(brand: Brand) => {
	// Manually define the branded type.
	type BrandedIdType = string & BrandType<Brand>;

	// A simple Zod schema just for validating the UUID format.
	const UuidSchema = z.uuid();

	return class BrandedId {
		public readonly value: BrandedIdType;

		private constructor(value: BrandedIdType) {
			this.value = value;
		}

		/**
		 * The only public way to create an instance of the BrandedId.
		 * It validates the input string to ensure it is a valid UUID.
		 * @param value - The raw string ID (must be a UUID).
		 * @returns A new instance of the BrandedId.
		 */
		public static create(value: string): BrandedId {
			// 1. Validate the input to ensure it's a UUID. This will throw if invalid.
			UuidSchema.parse(value);

			// 2. Cast the validated string to our branded type. This is safe because
			//    we just validated it.
			const brandedValue = value as BrandedIdType;

			// 3. Create the new instance.
			return new BrandedId(brandedValue);
		}

		/**
		 * Checks for equality against another BrandedId.
		 * @param other - The other BrandedId to compare with.
		 * @returns `true` if the values are identical, `false` otherwise.
		 */
		public equals(other: BrandedId): boolean {
			return this.value === other.value;
		}

		/**
		 * Returns the raw string value of the ID.
		 * @returns The UUID string.
		 */
		public toString(): string {
			return this.value;
		}
	};
};
