export const DEFAULT_DATABASE_URL = 'postgres://todo:todo@localhost:5432/todo';

export interface Config {
  databaseUrl: string;
  host: string;
  port: number;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`PORT must be a port number from 0 to 65535, got "${env.PORT}"`);
  }
  return {
    databaseUrl: env.DATABASE_URL || DEFAULT_DATABASE_URL,
    host: env.HOST || '0.0.0.0',
    port,
  };
}
