import { describe, it, expect, beforeEach } from "bun:test";
import { createPort, resetDI } from "./di.v2";
import { createModule } from "./module";
import {
  createModuleComposition,
  createEnvironmentModuleComposition,
  applyModuleComposition
} from "./module-composition";
import { useModule } from "./module";

// Reset DI container before each test
describe("Module Composition", () => {
  beforeEach(() => {
    resetDI();
  });

  // Define some ports for testing
  const findUserPort = createPort<() => Promise<{ id: string; name: string }>>();
  const saveOrderPort = createPort<(order: { id: string; userId: string }) => Promise<void>>();
  const sendEmailPort = createPort<(email: { to: string; subject: string }) => Promise<void>>();

  it("should create and apply a module composition", async () => {
    // Create module
    const orderModule = createModule({
      findUser: findUserPort,
      saveOrder: saveOrderPort,
      sendEmail: sendEmailPort
    });

    // Create composition with adapters
    const composition = createModuleComposition({
      findUser: async () => ({ id: "1", name: "Test User" }),
      saveOrder: async (order: { id: string; userId: string }) => {
        console.log(`Saving order ${order.id}`);
      },
      sendEmail: async (email: { to: string; subject: string }) => {
        console.log(`Sending email to ${email.to}`);
      }
    });

    // Apply composition
    applyModuleComposition(orderModule, composition);

    // Use module
    const { findUser, saveOrder, sendEmail } = useModule(orderModule);

    // Test that the adapters work
    const user = await findUser();
    expect(user.id).toBe("1");
    expect(user.name).toBe("Test User");
  });

  it("should throw an error if a port is missing an adapter", () => {
    // Create module
    const orderModule = createModule({
      findUser: findUserPort,
      saveOrder: saveOrderPort,
      sendEmail: sendEmailPort
    });

    // Try to create composition with missing adapter - this should throw
    expect(() => {
      const composition = createModuleComposition({
        findUser: async () => ({ id: "1", name: "Test User" }),
        saveOrder: async (order: { id: string; userId: string }) => {},
        // Missing sendEmail adapter
      });
      
      // Apply the composition to trigger validation
      composition(orderModule);
    }).toThrow("Missing adapter for port 'sendEmail' in module composition");
  });

  it("should throw an error if an extra adapter is provided", () => {
    // Create module
    const orderModule = createModule({
      findUser: findUserPort,
      saveOrder: saveOrderPort
    });

    // Try to create composition with extra adapter - this should throw
    expect(() => {
      const composition = createModuleComposition({
        findUser: async () => ({ id: "1", name: "Test User" }),
        saveOrder: async (order: { id: string; userId: string }) => {},
        sendEmail: async (email: { to: string; subject: string }) => {}, // Extra adapter
      });
      
      // Apply the composition to trigger validation
      composition(orderModule);
    }).toThrow("Unexpected adapter for key 'sendEmail' that doesn't correspond to any port in the module");
  });

  it("should create and apply an environment-specific module composition", async () => {
    // Create module
    const orderModule = createModule({
      findUser: findUserPort,
      saveOrder: saveOrderPort
    });

    // Create environment compositions
    const compositions = {
      test: createModuleComposition({
        findUser: async () => ({ id: "test-1", name: "Test User" }),
        saveOrder: async () => {}
      }),
      production: createModuleComposition({
        findUser: async () => ({ id: "prod-1", name: "Production User" }),
        saveOrder: async () => {}
      })
    };

    // Apply environment composition
    const environmentComposition = createEnvironmentModuleComposition("test", compositions);
    applyModuleComposition(orderModule, environmentComposition);

    // Use module
    const { findUser } = useModule(orderModule);

    // Test that the correct adapter is used
    const user = await findUser();
    expect(user.id).toBe("test-1");
    expect(user.name).toBe("Test User");
  });

  it("should throw an error for unknown environment", () => {
    const compositions = {};

    expect(() => {
      createEnvironmentModuleComposition("unknown", compositions);
    }).toThrow("No composition found for environment: unknown");
  });
});