import { Context } from 'hono';

export const createMockContext = (overrides = {}): any => {
  return {
    req: {
      json: async () => ({}),
      query: () => ({}),
      param: (key: string) => '',
      raw: {
        headers: new Headers(),
      },
    },
    json: (data: any, status?: number) => ({ data, status }),
    get: (key: string) => null,
    set: (key: string, value: any) => {},
    ...overrides,
  };
};
