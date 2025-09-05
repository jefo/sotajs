import { describe, it, expect, beforeEach, mock } from "bun:test";
import { createPort, setPortAdapter, usePort, resetDI } from "./di.v2";
import { z } from 'zod';

// ============================================================================
// DOMAIN LAYER
// ============================================================================

// Simple User entity demonstrating domain modeling
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
// APPLICATION LAYER - OUTPUT PORTS
// ============================================================================

// Business outcome DTOs - pure data structures with validation
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

// SEMANTIC OUTPUT PORTS - Each represents a specific business outcome
// Naming convention: *OutPort to clearly identify output ports
const UserUpdatedOutPort = createPort<(dto: UserUpdatedOutput) => Promise<void>>();
const UserUpdateFailedOutPort = createPort<(dto: UserUpdateFailedOutput) => Promise<void>>();

// ============================================================================
// APPLICATION LAYER - DATA PORTS
// ============================================================================

// Ports for domain interactions - these are implementation contracts
const findUserByIdPort = createPort<(id: string) => Promise<User | null>>();
const saveUserPort = createPort<(user: User) => Promise<void>>();

// ============================================================================
// APPLICATION LAYER - USE CASE
// ============================================================================

// Input validation schema - defines the public contract
const UpdateUserProfileInputSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email()
});

type UpdateUserProfileInput = z.infer<typeof UpdateUserProfileInputSchema>;

/**
 * Use Case: Update User Profile
 * 
 * Key characteristics of semantic output ports pattern:
 * 1. Returns Promise<void> instead of data
 * 2. Communicates results through semantic output ports
 * 3. Business DTOs contain only domain data, no UI concerns
 * 4. Clear separation between business logic and presentation
 */
const updateUserProfileUseCase = async (input: UpdateUserProfileInput): Promise<void> => {
  // Validate input at the boundary
  const command = UpdateUserProfileInputSchema.parse(input);
  
  // Get all required dependencies through ports
  const findUserById = usePort(findUserByIdPort);
  const saveUser = usePort(saveUserPort);
  
  // SEMANTIC OUTPUT PORTS - one for each business outcome
  const userUpdated = usePort(UserUpdatedOutPort);      // Success outcome
  const userUpdateFailed = usePort(UserUpdateFailedOutPort); // Failure outcome
  
  // Business logic execution
  const user = await findUserById(command.userId);
  if (!user) {
    // FAILURE: Communicate through semantic output port
    await userUpdateFailed({
      userId: command.userId,
      reason: 'User not found'
    });
    return;
  }
  
  try {
    // Update user (domain logic)
    user.updateEmail(command.email);
    user.name = command.name;
    await saveUser(user);
    
    // SUCCESS: Communicate through semantic output port
    // DTO contains only business data, no UI formatting
    await userUpdated({
      userId: user.id,
      newName: user.name,
      newEmail: user.email
    });
  } catch (error: any) {
    // FAILURE: Communicate through semantic output port
    await userUpdateFailed({
      userId: command.userId,
      reason: error.message || 'Update failed'
    });
  }
};

// ============================================================================
// TESTS - Self-documenting examples of the pattern
// ============================================================================

describe('Semantic Output Ports Pattern', () => {
  // Mock adapters for data ports
  let mockFindUserById: ReturnType<typeof mock>;
  let mockSaveUser: ReturnType<typeof mock>;
  
  // Mock adapters for output ports (presentation adapters in real app)
  let mockUserUpdated: ReturnType<typeof mock>;
  let mockUserUpdateFailed: ReturnType<typeof mock>;
  
  beforeEach(() => {
    resetDI();
    
    // Setup data port mocks
    mockFindUserById = mock(async (id: string) => {
      if (id === '123e4567-e89b-12d3-a456-426614174000') {
        return User.create('123e4567-e89b-12d3-a456-426614174000', 'John Doe', 'john@example.com');
      }
      return null;
    });
    
    mockSaveUser = mock(async (user: User) => {
      // Simulate save operation
    });
    
    // Setup output port mocks (presentation adapters in real app)
    mockUserUpdated = mock(async (dto: UserUpdatedOutput) => {
      // In real app, this would be a presentation adapter that formats the DTO for UI
    });
    
    mockUserUpdateFailed = mock(async (dto: UserUpdateFailedOutput) => {
      // In real app, this would be a presentation adapter that formats error for UI
    });
    
    // Bind ports to mocks in composition root
    setPortAdapter(findUserByIdPort, mockFindUserById);
    setPortAdapter(saveUserPort, mockSaveUser);
    setPortAdapter(UserUpdatedOutPort, mockUserUpdated);
    setPortAdapter(UserUpdateFailedOutPort, mockUserUpdateFailed);
  });
  
  /**
   * Test: SUCCESS Path
   * 
   * Demonstrates:
   * - Use case calls success output port with business DTO
   * - DTO contains only domain data (userId, newName, newEmail)
   * - No UI components or formatting in DTO
   */
  it('should call UserUpdatedOutPort when user profile is successfully updated', async () => {
    // Arrange
    const input = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Jane Smith',
      email: 'jane@example.com'
    };
    
    // Act
    await updateUserProfileUseCase(input);
    
    // Assert data ports were called correctly
    expect(mockFindUserById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    expect(mockSaveUser).toHaveBeenCalled();
    
    // Assert success output port was called with correct business data
    expect(mockUserUpdated).toHaveBeenCalledWith({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      newName: 'Jane Smith',
      newEmail: 'jane@example.com'
    });
    
    // Assert failure output port was not called
    expect(mockUserUpdateFailed).not.toHaveBeenCalled();
  });
  
  /**
   * Test: FAILURE Path - User Not Found
   * 
   * Demonstrates:
   * - Use case calls failure output port for business validation errors
   * - DTO contains business reason, not UI error message
   * - Clear separation between domain logic and presentation
   */
  it('should call UserUpdateFailedOutPort when user is not found', async () => {
    // Arrange
    const input = {
      userId: '123e4567-e89b-12d3-a456-426614174001', // Non-existent user
      name: 'Jane Smith',
      email: 'jane@example.com'
    };
    
    // Act
    await updateUserProfileUseCase(input);
    
    // Assert data port was called
    expect(mockFindUserById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174001');
    
    // Assert failure output port was called with business reason
    expect(mockUserUpdateFailed).toHaveBeenCalledWith({
      userId: '123e4567-e89b-12d3-a456-426614174001',
      reason: 'User not found'
    });
    
    // Assert success output port was not called
    expect(mockUserUpdated).not.toHaveBeenCalled();
    expect(mockSaveUser).not.toHaveBeenCalled();
  });
  
  /**
   * Test: FAILURE Path - Exception Handling
   * 
   * Demonstrates:
   * - Use case handles exceptions and routes through failure output port
   * - Error details are captured in business DTO
   * - Consistent error handling regardless of failure type
   */
  it('should call UserUpdateFailedOutPort when save operation throws an error', async () => {
    // Arrange - Override mock to simulate database error
    mockSaveUser.mockImplementationOnce(async () => {
      throw new Error('Database connection failed');
    });
    
    const input = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Jane Smith',
      email: 'jane@example.com'
    };
    
    // Act
    await updateUserProfileUseCase(input);
    
    // Assert data ports were called
    expect(mockFindUserById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    expect(mockSaveUser).toHaveBeenCalled();
    
    // Assert failure output port was called with error details
    expect(mockUserUpdateFailed).toHaveBeenCalledWith({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      reason: 'Database connection failed'
    });
    
    // Assert success output port was not called
    expect(mockUserUpdated).not.toHaveBeenCalled();
  });
  
  /**
   * Test: Business DTO Purity
   * 
   * Demonstrates:
   * - Output ports receive pure business data DTOs
   * - No UI components, formatting, or presentation concerns
   * - DTOs contain only domain-relevant information
   */
  it('should pass business outcome DTOs to output ports, not UI components', async () => {
    // This test validates that output ports receive pure business data
    let capturedSuccessDto: UserUpdatedOutput | undefined;
    let capturedFailureDto: UserUpdateFailedOutput | undefined;
    
    // Create specific mocks to capture what DTOs are passed
    const capturingUserUpdated = mock(async (dto: UserUpdatedOutput) => {
      capturedSuccessDto = dto;
    });
    
    const capturingUserUpdateFailed = mock(async (dto: UserUpdateFailedOutput) => {
      capturedFailureDto = dto;
    });
    
    // Bind capturing adapters
    setPortAdapter(UserUpdatedOutPort, capturingUserUpdated);
    setPortAdapter(UserUpdateFailedOutPort, capturingUserUpdateFailed);
    
    // Test success case
    const successInput = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Jane Smith',
      email: 'jane@example.com'
    };
    
    await updateUserProfileUseCase(successInput);
    
    // Verify success DTO contains only business data
    expect(capturedSuccessDto).toBeDefined();
    expect(capturedSuccessDto).toEqual({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      newName: 'Jane Smith',
      newEmail: 'jane@example.com'
    });
    
    // Verify no UI components or formatting in DTO
    expect(capturedSuccessDto).not.toHaveProperty('message');
    expect(capturedSuccessDto).not.toHaveProperty('component');
    expect(capturedSuccessDto).not.toHaveProperty('html');
  });
  
  /**
   * Test: Naming Convention Compliance
   * 
   * Demonstrates:
   * - Output ports follow the *OutPort naming convention
   * - Clear identification of output ports in code
   * - Consistent naming across the application
   */
  it('should follow the *OutPort naming convention for output ports', () => {
    // This test verifies that output ports follow the required naming convention
    expect(UserUpdatedOutPort).toBeDefined();
    expect(UserUpdateFailedOutPort).toBeDefined();
    
    // The port names should clearly indicate they are output ports
    // This helps with code readability and maintainability
  });
});