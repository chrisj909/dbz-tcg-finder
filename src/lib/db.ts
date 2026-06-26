import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

// Lazily-initialized Neon client.
//
// We must NOT create the client (or throw on a missing DATABASE_URL) at module
// import time: `next build` imports these modules to collect routes, and the
// scanner / tests import them too. Throwing at import would break the green-gate
// build in any environment without a database. Instead we defer creation until
// the first query actually runs, and only then require DATABASE_URL.
let client: NeonQueryFunction<false, false> | undefined;

function getClient(): NeonQueryFunction<false, false> {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    client = neon(url);
  }
  return client;
}

// A Proxy that forwards the tagged-template call (`sql\`SELECT ...\``) and any
// property access (`sql.query`, `sql.transaction`) to the lazily-created client.
// Behaves exactly like the real Neon function once DATABASE_URL is present.
export const sql: NeonQueryFunction<false, false> = new Proxy(
  function () {} as unknown as NeonQueryFunction<false, false>,
  {
    apply: (_target, _thisArg, args) =>
      (getClient() as unknown as (...a: unknown[]) => unknown)(
        ...(args as unknown[]),
      ),
    get: (_target, prop) =>
      (getClient() as unknown as Record<string | symbol, unknown>)[prop],
  },
);
