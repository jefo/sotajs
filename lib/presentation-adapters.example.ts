// ============================================================================
// PRESENTATION ADAPTERS EXAMPLE
//
// These adapters demonstrate how to consume semantic output ports and
// transform business DTOs to platform-specific UI representations.
//
// Key principles:
// 1. Adapters receive pure business DTOs from output ports
// 2. All UI concerns (formatting, localization, component creation)
//    are contained within the adapters
// 3. Same business DTOs can be transformed for different platforms
// ============================================================================

import type {
	UserUpdatedOutput,
	UserUpdateFailedOutput,
} from "./semantic-ports.test";

// ============================================================================
// CONSOLE PRESENTATION ADAPTER
// Transforms business DTOs to formatted console messages
// ============================================================================

export const consoleUserUpdated = async (dto: UserUpdatedOutput) => {
	// Presentation adapter contains all UI formatting and localization logic
	// This is where UI concerns live, not in the use case
	const message =
		`✅ User profile updated successfully!\n` +
		`ID: ${dto.userId}\n` +
		`Name: ${dto.newName}\n` +
		`Email: ${dto.newEmail}`;
	console.log(message);
};

export const consoleUserUpdateFailed = async (dto: UserUpdateFailedOutput) => {
	// Error message formatting with user guidance
	const message =
		`❌ Failed to update user profile\n` +
		`User ID: ${dto.userId}\n` +
		`Reason: ${dto.reason}\n` +
		`Please try again or contact support.`;
	console.error(message);
};

// ============================================================================
// WEB PRESENTATION ADAPTER
// Transforms the same business DTOs to HTTP responses
// ============================================================================

export const webUserUpdated = async (dto: UserUpdatedOutput) => {
	// Web-specific formatting - returns HTTP response structure
	return {
		status: 200,
		headers: { "Content-Type": "application/json" },
		body: {
			message: "Profile updated successfully",
			data: {
				userId: dto.userId,
				newName: dto.newName,
				newEmail: dto.newEmail,
			},
		},
	};
};

export const webUserUpdateFailed = async (dto: UserUpdateFailedOutput) => {
	// Web-specific error response
	return {
		status: 400,
		headers: { "Content-Type": "application/json" },
		body: {
			error: "Update failed",
			message: dto.reason,
			userId: dto.userId,
		},
	};
};
