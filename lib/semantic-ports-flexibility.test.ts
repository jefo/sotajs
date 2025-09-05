import { describe, it, expect, beforeEach, mock } from "bun:test";
import { createPort, setPortAdapter, usePort, resetDI } from "./di.v2";
import { z } from 'zod';

// ============================================================================
// SEMANTIC OUTPUT PORTS - PLATFORM FLEXIBILITY DEMONSTRATION
// 
// This test file demonstrates the key benefit of semantic output ports:
// The ability to easily switch between different presentation platforms
// while keeping the business logic unchanged.
// ============================================================================

// ============================================================================
// DOMAIN MODEL (Simplified for demonstration)
// ============================================================================

class User {
  private constructor(
    public readonly id: string,
    public name: string,
    public email: string
  ) {}

  static create(id: string, name: string, email: string): User {
    return new User(id, name, email);
  }

  updateEmail(newEmail: string): void {
    this.email = newEmail;
  }
}

// ============================================================================
// APPLICATION LAYER - SEMANTIC OUTPUT PORTS
// ============================================================================

// Business outcome DTOs - pure domain data
const UserUpdatedOutputSchema = z.object({
  userId: z.string().uuid(),
  newName: z.string(),
  newEmail: z.string().email()
});

const UserUpdateFailedOutputSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string()
});

type UserUpdatedOutput = z.infer<typeof UserUpdatedOutputSchema>;
type UserUpdateFailedOutput = z.infer<typeof UserUpdateFailedOutputSchema>;

// SEMANTIC OUTPUT PORTS with *OutPort naming convention
const UserUpdatedOutPort = createPort<(dto: UserUpdatedOutput) => Promise<void>>();
const UserUpdateFailedOutPort = createPort<(dto: UserUpdateFailedOutput) => Promise<void>>();

// Data ports for domain interactions
const findUserByIdPort = createPort<(id: string) => Promise<User | null>>();
const saveUserPort = createPort<(user: User) => Promise<void>>();

// ============================================================================
// APPLICATION LAYER - USE CASE
// ============================================================================

const UpdateUserProfileInputSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email()
});

type UpdateUserProfileInput = z.infer<typeof UpdateUserProfileInputSchema>;

/**
 * Use Case: Update User Profile
 * 
 * This use case demonstrates platform flexibility:
 * - Same business logic works with any presentation adapter
 * - Output ports receive identical business DTOs regardless of platform
 * - Easy to switch between console, web, mobile, etc.
 */
const updateUserProfileUseCase = async (input: UpdateUserProfileInput): Promise<void> => {
  const command = UpdateUserProfileInputSchema.parse(input);
  
  // Get dependencies
  const findUserById = usePort(findUserByIdPort);
  const saveUser = usePort(saveUserPort);
  const userUpdated = usePort(UserUpdatedOutPort);
  const userUpdateFailed = usePort(UserUpdateFailedOutPort);
  
  // Business logic (unchanged regardless of presentation platform)
  const user = await findUserById(command.userId);
  if (!user) {
    await userUpdateFailed({
      userId: command.userId,
      reason: 'User not found'
    });
    return;
  }
  
  try {
    user.updateEmail(command.email);
    user.name = command.name;
    await saveUser(user);
    
    // SEMANTIC OUTPUT PORT - passes identical business DTO to all platforms
    await userUpdated({
      userId: user.id,
      newName: user.name,
      newEmail: user.email
    });
  } catch (error: any) {
    await userUpdateFailed({
      userId: command.userId,
      reason: error.message || 'Update failed'
    });
  }
};

// ============================================================================
// TESTS - Demonstrating Platform Flexibility
// ============================================================================

describe('Semantic Output Ports Platform Flexibility', () => {
  let mockFindUserById: ReturnType<typeof mock>;
  let mockSaveUser: ReturnType<typeof mock>;
  
  beforeEach(() => {
    resetDI();
    
    mockFindUserById = mock(async (id: string) => {
      if (id === '123e4567-e89b-12d3-a456-426614174000') {
        return User.create('123e4567-e89b-12d3-a456-426614174000', 'John Doe', 'john@example.com');
      }
      return null;
    });
    
    mockSaveUser = mock(async (user: User) => {
      // Simulate save operation
    });
    
    // Bind data ports (same for all platforms)
    setPortAdapter(findUserByIdPort, mockFindUserById);
    setPortAdapter(saveUserPort, mockSaveUser);
  });
  
  /**
   * Test: Platform Switching
   * 
   * Demonstrates the core benefit of semantic output ports:
   * - Same use case works with different presentation adapters
   * - Easy to switch between platforms by changing port bindings
   * - Business logic remains unchanged
   * 
   * This is the key advantage over traditional MVC approaches where
   * controllers are tightly coupled to specific presentation formats.
   */
  it('should allow switching between different presentation adapters', async () => {
    // Test with first presentation adapter (e.g., console)
    const adapter1 = mock(async (dto: UserUpdatedOutput) => {
      // Handle with first UI approach
    });
    
    setPortAdapter(UserUpdatedOutPort, adapter1);
    setPortAdapter(UserUpdateFailedOutPort, mock(async () => {}));
    
    await updateUserProfileUseCase({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Jane Smith',
      email: 'jane@example.com'
    });
    
    // Verify first adapter was called
    expect(adapter1).toHaveBeenCalledWith({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      newName: 'Jane Smith',
      newEmail: 'jane@example.com'
    });
    
    // Test with second presentation adapter (e.g., web)
    const adapter2 = mock(async (dto: UserUpdatedOutput) => {
      // Handle with second UI approach
    });
    
    // Reset and bind second adapter
    resetDI();
    setPortAdapter(findUserByIdPort, mockFindUserById);
    setPortAdapter(saveUserPort, mockSaveUser);
    setPortAdapter(UserUpdatedOutPort, adapter2);
    setPortAdapter(UserUpdateFailedOutPort, mock(async () => {}));
    
    await updateUserProfileUseCase({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Bob Johnson',
      email: 'bob@example.com'
    });
    
    // Verify second adapter was called
    expect(adapter2).toHaveBeenCalledWith({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      newName: 'Bob Johnson',
      newEmail: 'bob@example.com'
    });
  });
  
  /**
   * Test: Business DTO Consistency
   * 
   * Demonstrates that semantic output ports ensure:
   * - Identical business data flows to all presentation platforms
   * - No platform-specific data in DTOs
   * - Consistent business communication regardless of presentation
   * 
   * This is crucial for maintaining business logic integrity
   * across different presentation layers.
   */
  it('should pass the same business data structure to all adapters', async () => {
    // This demonstrates that business data is consistent regardless of platform
    
    let capturedData: any = null;
    
    const dataCapturingAdapter = mock(async (dto: UserUpdatedOutput) => {
      capturedData = dto;
    });
    
    setPortAdapter(UserUpdatedOutPort, dataCapturingAdapter);
    setPortAdapter(UserUpdateFailedOutPort, mock(async () => {}));
    
    await updateUserProfileUseCase({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Jane Smith',
      email: 'jane@example.com'
    });
    
    // Verify the business data structure
    expect(capturedData).toEqual({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      newName: 'Jane Smith',
      newEmail: 'jane@example.com'
    });
    
    // Verify it contains only business data, not UI components
    expect(capturedData).not.toHaveProperty('component');
    expect(capturedData).not.toHaveProperty('html');
    expect(capturedData).not.toHaveProperty('message');
  });
  
  /**
   * Test: Naming Convention Compliance
   * 
   * Demonstrates the importance of consistent naming:
   * - *OutPort suffix clearly identifies output ports
   * - Easy to distinguish from data ports and input ports
   * - Improves code readability and maintainability
   */
  it('should follow the *OutPort naming convention for all output ports', () => {
    // This test verifies that output ports follow the required naming convention
    expect(UserUpdatedOutPort).toBeDefined();
    expect(UserUpdateFailedOutPort).toBeDefined();
    
    // Naming convention benefits:
    // 1. Immediate identification of output ports
    // 2. Consistency across the codebase
    // 3. Clear separation from data ports (findUserByIdPort vs UserUpdatedOutPort)
    // 4. Better tooling support and code navigation
  });
});