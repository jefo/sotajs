// ============================================================================
// MAIN APPLICATION ENTRY POINT
// 
// Demonstrates the complete flow with semantic output ports.
//
// Key principles:
// 1. Application setup happens through composition root
// 2. Use cases are executed without concern for presentation
// 3. Results are handled automatically through output ports
// ============================================================================

import { bootstrapApplication } from "./composition-root.example";
import { updateUserProfileUseCase } from "./semantic-ports.test";

// ============================================================================
// APPLICATION EXECUTION
// ============================================================================

// Main function to run the application
async function main() {
  console.log("Starting application with semantic output ports pattern...");
  
  // Bootstrap the application with console presentation
  bootstrapApplication();
  
  console.log("\n--- Testing successful update ---");
  try {
    await updateUserProfileUseCase({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Jane Smith',
      email: 'jane.smith@example.com'
    });
  } catch (error) {
    console.error("Unexpected error:", error);
  }
  
  console.log("\n--- Testing user not found ---");
  try {
    await updateUserProfileUseCase({
      userId: '123e4567-e89b-12d3-a456-426614174001', // Non-existent user
      name: 'Bob Johnson',
      email: 'bob@example.com'
    });
  } catch (error) {
    console.error("Unexpected error:", error);
  }
  
  console.log("\nApplication finished.");
}

// Run the application if this file is executed directly
if (import.meta.main) {
  main().catch(console.error);
}