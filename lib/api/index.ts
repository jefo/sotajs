import { Hono } from 'hono';
import type { Env, Context, MiddlewareHandler } from 'hono';
import { serve } from '@hono/node-server';
import { z, ZodError } from 'zod';

// --- Типы для конфигурации ---

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';
type Middleware<E extends Env> = MiddlewareHandler<E>;

interface RouteConfig<E extends Env> {
  useCase: (input: any) => Promise<any>;
  path?: string;
  method?: HttpMethod;
  middlewares?: Middleware<E>[];
}

interface ApiConfig<E extends Env> {
  port?: number;
  cors?: any; // TODO: Уточнить тип для CORS
  middlewares?: Middleware<E>[];
  routes: (RouteConfig<E> | ((input: any) => Promise<any>))[];
}

const toKebabCase = (str: string) => {
    return str.replace(/([a-z0-9]|(?<=[a-z]))([A-Z])/g, '$1-$2').toLowerCase();
}

// --- Реализация ---

export const createApi = <E extends Env>(config: ApiConfig<E>) => {
  const app = new Hono<E>();

  // 1. Применяем глобальные middleware
  if (config.middlewares) {
    app.use('*', ...config.middlewares);
  }

  // 2. Обрабатываем роуты
  config.routes.forEach(routeOrUseCase => {
    const route: RouteConfig<E> = typeof routeOrUseCase === 'function' 
      ? { useCase: routeOrUseCase }
      : routeOrUseCase;

    // Соглашения для определения метода и пути
    const methodName = route.useCase.name.replace(/UseCase$/, '');
    let httpMethod: HttpMethod = 'post';
    if (methodName.startsWith('get') || methodName.startsWith('find')) httpMethod = 'get';
    if (methodName.startsWith('update')) httpMethod = 'put';
    if (methodName.startsWith('delete')) httpMethod = 'delete';

    const path = route.path || `/${toKebabCase(methodName)}`;
    const method = route.method || httpMethod;

    const finalHandler = async (c: Context<E>) => {
        try {
            const input = await c.req.json(); // TODO: add support for query and params
            const result = await route.useCase(input);
            return c.json(result);
        } catch (error) {
            if (error instanceof ZodError) {
                return c.json({ message: 'Validation failed', errors: error.issues }, 400);
            }
            // TODO: add more specific error handling
            return c.json({ message: 'Internal Server Error' }, 500);
        }
    };

    const handlers = [ ...(route.middlewares || []), finalHandler];

    app[method](path, ...handlers as any);
  });

  // 3. Возвращаем инстанс для запуска
  return {
    hono: app, // Возвращаем инстанс Hono для возможного расширения
    listen: (port?: number) => {
      const serverPort = port || config.port || 3000;
      console.log(`Server listening on port ${serverPort}`);
      serve({ fetch: app.fetch, port: serverPort });
    },
  };
};