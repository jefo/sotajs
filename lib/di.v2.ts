import Bottle from "bottlejs";

let container = new Bottle();
// The function signature as the user writes it (without Promise in return)
type PortFn = (...args: any[]) => any;

// The actual signature of the port and its adapter (with Promise)
type AdapterFn<T extends PortFn> = (...args: Parameters<T>) => Promise<ReturnType<T>>;

// The Port type. It holds the original function type in `T` for inference.
export type Port<T extends PortFn> = {
  symbol: symbol;
  T: T; // Keep original type for inference
} & AdapterFn<T>;


const store = new Map<symbol, any>();

// createPort
export function createPort<T extends PortFn>(): Port<T> {
  const symbol = Symbol();
  const fn: any = () => {
    throw new Error(`Port with symbol ${symbol.toString()} was not provided`);
  };
  fn.symbol = symbol;
  return fn as Port<T>;
}

// usePort
export function usePort<T extends PortFn>(port: Port<T>): AdapterFn<T> {
  const adapter = store.get(port.symbol);
  if (!adapter) {
    throw new Error(`Adapter for port ${port.symbol.toString()} not set`);
  }
  return adapter;
}

// setPortAdapter
export function setPortAdapter<T extends PortFn>(port: Port<T>, adapter: AdapterFn<T>): void {
  store.set(port.symbol, adapter);
}

export function setPortAdapters(adapters: [Port<any>, any][]): void {
  for (const [port, adapter] of adapters) {
    setPortAdapter(port, adapter);
  }
}

export function usePorts<T extends Port<any>[]>(...ports: T): { [K in keyof T]: T[K] extends Port<infer U> ? AdapterFn<U> : never } {
  return ports.map(usePort) as any;
}

export function resetDI(): void {
  store.clear();
}
