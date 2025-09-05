// ============================================================================
// DATA ADAPTERS EXAMPLE
// 
// These adapters implement the data ports for interacting with infrastructure.
//
// Key principles:
// 1. Adapters implement the contracts defined by data ports
// 2. They handle infrastructure-specific concerns (database, APIs, etc.)
// 3. They transform between domain objects and infrastructure representations
// ============================================================================

import { User } from "./semantic-ports.test";

// ============================================================================
// IN-MEMORY USER REPOSITORY
// Simple in-memory storage for demonstration purposes
// ============================================================================

// Simple in-memory storage for demonstration
const userDatabase = new Map<string, User>();

// Initialize with test data
userDatabase.set(
  '123e4567-e89b-12d3-a456-426614174000', 
  User.create('123e4567-e89b-12d3-a456-426614174000', 'John Doe', 'john@example.com')
);

// ============================================================================
// DATA ADAPTER IMPLEMENTATIONS
// ============================================================================

// Data adapter for finding user by ID
export const inMemoryFindUserById = async (id: string): Promise<User | null> => {
  const user = userDatabase.get(id);
  return user ? user : null;
};

// Data adapter for saving user
export const inMemorySaveUser = async (user: User): Promise<void> => {
  // Simulate database save operation
  userDatabase.set(user.id, user);
  console.log(`User ${user.id} saved to database`);
};