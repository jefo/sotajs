
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { z } from 'zod';

// --- Типы для конфигурации ---

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';
type Middleware<T> = (c: T, next: () => Promise<void>) => Promise<void> | void;

interface RouteConfig<T> {
  useCase: (input: any) => Promise<any>;
  path?: string;
  method?: HttpMethod;
  middlewares?: Middleware<T>[];
}

interface ApiConfig<T> {
  port?: number;
  cors?: any; // TODO: Уточнить тип для CORS
  middlewares?: Middleware<T>[];
  routes: (RouteConfig<T> | ((input: any) => Promise<any>))[];
}

const toKebabCase = (str: string) => {
    return str.replace(/([a-z0-9]|(?<=[a-z]))([A-Z])/g, '$1-$2').toLowerCase();
}

// --- Реализация ---

export const createApi = <T>(config: ApiConfig<T>) => {
  const app = new Hono<T>();

  // 1. Применяем глобальные middleware
  if (config.middlewares) {
    app.use('*_string', ...config.middlewares);
  }

  // 2. Обрабатываем роуты
  config.routes.forEach(routeOrUseCase => {
    const route: RouteConfig<T> = typeof routeOrUseCase === 'function' 
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

    const handlers = [ ...(route.middlewares || []), async (c: any) => {
        try {
            const input = await c.req.json(); // TODO: add support for query and params
            const result = await route.useCase(input);
            return c.json(result);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return c.json({ message: 'Validation failed', errors: error.errors }, 400);
            }
            // TODO: add more specific error handling
            return c.json({ message: 'Internal Server Error' }, 500);
        }
    }];

    app[method](path, ...handlers);
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
