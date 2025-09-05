// ============================================================================
// COMPOSITION ROOT EXAMPLE
// 
// This shows how to bind presentation adapters to semantic output ports.
//
// Key principles:
// 1. All port-to-adapter bindings happen in one place
// 2. Easy to switch between different presentation platforms
// 3. Clear separation between application setup and business logic
// ============================================================================

import { setPortAdapter, resetDI } from "./di.v2";

// Import the semantic output ports from the use case (with *OutPort suffix)
import { 
  UserUpdatedOutPort, 
  UserUpdateFailedOutPort,
  findUserByIdPort,
  saveUserPort
} from "./semantic-ports.test";

// Import presentation adapters
import { consoleUserUpdated, consoleUserUpdateFailed } from "./presentation-adapters.example";

// Import data adapters
import { inMemoryFindUserById, inMemorySaveUser } from "./data-adapters.example";

// ============================================================================
// APPLICATION BOOTSTRAP FUNCTIONS
// ============================================================================

// Bootstrap with console presentation
export const bootstrapApplication = () => {
  resetDI();
  
  // Bind data ports to infrastructure adapters
  setPortAdapter(findUserByIdPort, inMemoryFindUserById);
  setPortAdapter(saveUserPort, inMemorySaveUser);
  
  // Bind semantic output ports to presentation adapters
  // This is where we choose which UI channel to use
  setPortAdapter(UserUpdatedOutPort, consoleUserUpdated);
  setPortAdapter(UserUpdateFailedOutPort, consoleUserUpdateFailed);
};

// Example of switching to web presentation
export const bootstrapWebApplication = () => {
  resetDI();
  
  // Same data adapters
  setPortAdapter(findUserByIdPort, inMemoryFindUserById);
  setPortAdapter(saveUserPort, inMemorySaveUser);
  
  // Import web adapters (would be at the top in real code)
  // setPortAdapter(UserUpdatedOutPort, webUserUpdated);
  // setPortAdapter(UserUpdateFailedOutPort, webUserUpdateFailed);
};