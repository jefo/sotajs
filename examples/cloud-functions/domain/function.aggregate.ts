import { z } from "zod";
import { createAggregate, IDomainEvent } from "../../../lib";

// ============================================================================
// Domain Events
// ============================================================================

export class FunctionDeployedEvent implements IDomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly version: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class FunctionInvokedEvent implements IDomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly executionTime: number,
    public readonly success: boolean,
    public readonly timestamp: Date = new Date(),
  ) {}
}

export class FunctionDeletedEvent implements IDomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ============================================================================
// Schema & Types
// ============================================================================

const CloudFunctionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(64),
  runtime: z.enum(["nodejs16", "nodejs18", "nodejs20", "python39", "python310", "go121"]),
  entrypoint: z.string(),
  memory: z.number().refine((m) => m >= 128 && m <= 4096, "Memory must be 128-4096 MB"),
  executionTimeout: z.number().refine((t) => t >= 1 && t <= 600, "Timeout must be 1-600 seconds"),
  code: z.string(),
  status: z.enum(["creating", "active", "error", "deleting"]),
  version: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

type CloudFunctionProps = z.infer<typeof CloudFunctionSchema>;

// ============================================================================
// Aggregate Definition
// ============================================================================

export const CloudFunction = createAggregate({
  name: "CloudFunction",
  schema: CloudFunctionSchema,
  entities: {},
  invariants: [
    // Invariant: Function name must be unique (checked at application layer)
    (props) => {
      if (!props.name.match(/^[a-z0-9-]+$/)) {
        throw new Error("Function name must contain only lowercase letters, numbers, and hyphens");
      }
    },

    // Invariant: Code must not be empty
    (props) => {
      if (!props.code.trim()) {
        throw new Error("Function code cannot be empty");
      }
    },

    // Invariant: Version must follow semver-like pattern
    (props) => {
      if (!props.version.match(/^\d+\.\d+\.\d+$/)) {
        throw new Error("Version must be in format X.Y.Z");
      }
    },
  ],
  actions: {
    /**
     * Deploy new version of the function
     */
    deploy: (state, newCode: string, newVersion: string) => {
      if (state.status === "deleting") {
        throw new Error("Cannot deploy function that is being deleted");
      }

      state.code = newCode;
      state.version = newVersion;
      state.status = "active";
      state.updatedAt = new Date();

      return {
        event: new FunctionDeployedEvent(state.id, newVersion),
      };
    },

    /**
     * Mark function as invoked (for tracking)
     */
    invoke: (state, executionTime: number, success: boolean) => {
      if (state.status !== "active") {
        throw new Error(`Cannot invoke function with status: ${state.status}`);
      }

      state.updatedAt = new Date();

      return {
        event: new FunctionInvokedEvent(state.id, executionTime, success),
      };
    },

    /**
     * Mark function for deletion
     */
    markForDeletion: (state) => {
      if (state.status === "deleting") {
        throw new Error("Function is already being deleted");
      }

      state.status = "deleting";
      state.updatedAt = new Date();
    },

    /**
     * Set error status
     */
    setError: (state, reason: string) => {
      state.status = "error";
      state.updatedAt = new Date();
    },
  },
  computed: {
    /**
     * Check if function is ready to be invoked
     */
    isReady: (props) => props.status === "active",

    /**
     * Check if function can be deleted
     */
    canBeDeleted: (props) => props.status !== "deleting",

    /**
     * Memory in GB (for display)
     */
    memoryGb: (props) => props.memory / 1024,

    /**
     * Runtime family (nodejs, python, go)
     */
    runtimeFamily: (props) => {
      if (props.runtime.startsWith("nodejs")) return "nodejs";
      if (props.runtime.startsWith("python")) return "python";
      if (props.runtime.startsWith("go")) return "go";
      return "unknown";
    },
  },
});

export type CloudFunction = ReturnType<typeof CloudFunction.create>;
