import type { MockDb } from "./types";
import { seedDb } from "./seed";

const GLOBAL_KEY = "__speedshift_mock_db__";

type GlobalWithDb = typeof globalThis & {
  [GLOBAL_KEY]?: MockDb;
};

const getGlobal = () => globalThis as GlobalWithDb;

export function getDb(): MockDb {
  const g = getGlobal();
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = seedDb();
  return g[GLOBAL_KEY]!;
}

export function resetDb(): MockDb {
  const g = getGlobal();
  g[GLOBAL_KEY] = seedDb();
  return g[GLOBAL_KEY]!;
}
