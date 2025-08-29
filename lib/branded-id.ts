import { z } from "zod";

/**
 * A higher-order function that creates a strongly-typed, branded ID class.
 * This utility helps ensure that you cannot accidentally mix up different types of IDs
 * (e.g., passing a `ProductId` where a `UserId` is expected).
 *
 * @param brand - A unique string literal to serve as the brand.
 * @returns A class for the branded ID with schema property.
 */
export const createBrandedId = <Brand extends string>(brand: Brand) => {
	// 1. Create a branded type using TypeScript's branded pattern

	// 2. Create a Zod schema that validates UUID and transforms to branded type
	const BrandedIdSchema = z.uuid().brand();
  type BrandedIdType = z.Infer<typeof BrandedIdSchema>;
	
	// 3. Return a class that encapsulates the branded ID.
	class BrandedId {
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
			// The `.parse()` method will throw an error if the value is not a valid UUID.
			return new BrandedId(BrandedIdSchema.parse(value));
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

		/**
		 * The Zod schema for this branded ID type.
		 * This can be used for validation in other schemas.
		 */
		public static readonly schema = BrandedIdSchema;
	}

	return BrandedId;
};
