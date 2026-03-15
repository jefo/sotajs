import { test, expect, beforeEach, describe } from "bun:test";
import { createPort, resetDI, setPortAdapters, usePorts } from "./di.v2";

// 1. Reset DI container before each test for isolation
beforeEach(() => {
	resetDI();
});

describe("usePorts (object-based)", () => {
	test("should resolve multiple ports as an object", async () => {
		const portA = createPort<() => string>();
		const portB = createPort<(n: number) => number>();

		setPortAdapters([
			[portA, async () => "A"],
			[portB, async (n: number) => n * 2],
		]);

		const db = usePorts({
			a: portA,
			b: portB,
		});

		expect(await db.a()).toBe("A");
		expect(await db.b(10)).toBe(20);
	});
});
