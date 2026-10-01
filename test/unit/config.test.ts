import { describe, expect, it } from 'vitest';
import { DEFAULT_DATABASE_URL, loadConfig } from '../../src/config.js';

describe('loadConfig', () => {
  it('uses the Docker Compose database and port 3000 by default', () => {
    expect(loadConfig({})).toEqual({ databaseUrl: DEFAULT_DATABASE_URL, host: '0.0.0.0', port: 3000 });
    expect(DEFAULT_DATABASE_URL).toBe('postgres://todo:todo@localhost:5432/todo');
  });

  it('reads DATABASE_URL, HOST and PORT', () => {
    const config = loadConfig({
      DATABASE_URL: 'postgres://me:secret@db.example.com:6543/todos',
      HOST: '127.0.0.1',
      PORT: '8080',
    });
    expect(config).toEqual({
      databaseUrl: 'postgres://me:secret@db.example.com:6543/todos',
      host: '127.0.0.1',
      port: 8080,
    });
  });

  it('rejects a PORT that is not a port number', () => {
    expect(() => loadConfig({ PORT: 'eighty' })).toThrow('PORT must be a port number from 0 to 65535, got "eighty"');
    expect(() => loadConfig({ PORT: '70000' })).toThrow('PORT must be a port number');
  });
});
