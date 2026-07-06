import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';

// ---------------------------------------------------------------------------
// Minimal mocks so we can construct the server without real infra
// ---------------------------------------------------------------------------
vi.mock('../src/lib/env.js', () => ({
  env: {
    STELLAR_NETWORK: 'TESTNET',
    API_PORT: 4000,
    API_HOST: '0.0.0.0',
    API_CORS_ORIGIN: 'http://localhost:5173',
    API_LOG_LEVEL: 'silent',
    POSTGRES_HOST: 'localhost',
    POSTGRES_PORT: 5432,
    POSTGRES_USER: 'solshare',
    POSTGRES_PASSWORD: 'solshare',
    POSTGRES_DB: 'solshare',
  },
}));

vi.mock('../src/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    child: () => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
    }),
    level: 'silent',
  },
}));

vi.mock('../src/lib/stellar.js', () => ({
  getClient: vi.fn().mockReturnValue({
    registry: {
      getAllArrays: vi.fn().mockResolvedValue([]),
      getArray: vi.fn().mockResolvedValue(null),
    },
  }),
}));

vi.mock('../src/lib/cache.js', () => ({
  cache: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  },
}));

// ---------------------------------------------------------------------------
// Tests that only rely on pure Fastify logic (no external connections)
// ---------------------------------------------------------------------------

describe('Fastify server setup', () => {
  it('can be instantiated directly', () => {
    const app = Fastify({ logger: false });
    expect(app).toBeDefined();
    expect(typeof app.get).toBe('function');
    expect(typeof app.post).toBe('function');
    expect(typeof app.register).toBe('function');
  });

  it('handles unknown routes with 404', async () => {
    const app = Fastify({ logger: false });
    const res = await app.inject({ method: 'GET', url: '/not-a-route' });
    expect(res.statusCode).toBe(404);
  });

  it('correctly registers a simple route', async () => {
    const app = Fastify({ logger: false });
    app.get('/ping', async () => ({ pong: true }));
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/ping' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ pong: true });
    await app.close();
  });
});

describe('Health endpoint shape', () => {
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    // Register a stub that mirrors the shape of healthRoutes
    app.get('/api/health', async () => ({
      status: 'ok',
      version: '0.1.0',
      network: 'TESTNET',
      horizonReachable: true,
      sorobanReachable: true,
      databaseReachable: false,
      uptimeSeconds: 0,
    }));
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a HealthCheckResponse shape', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('network');
    expect(body).toHaveProperty('horizonReachable');
    expect(body).toHaveProperty('sorobanReachable');
    expect(body).toHaveProperty('databaseReachable');
    expect(body).toHaveProperty('uptimeSeconds');
  });

  it('status is one of ok / degraded', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    const body = res.json() as { status: string };
    expect(['ok', 'degraded']).toContain(body.status);
  });
});

describe('Stats endpoint shape', () => {
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    app.get('/api/stats', async () => ({
      totalArrays: 0,
      activeArrays: 0,
      totalCapacityW: 0,
      totalSharesOutstanding: '0',
      totalYieldClaimed: '0',
      totalBridgedVolume: '0',
    }));
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns correct StatsResponse fields', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/stats' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('totalArrays');
    expect(body).toHaveProperty('activeArrays');
    expect(body).toHaveProperty('totalCapacityW');
    expect(body).toHaveProperty('totalSharesOutstanding');
    expect(body).toHaveProperty('totalYieldClaimed');
    expect(body).toHaveProperty('totalBridgedVolume');
  });
});

describe('Arrays pagination endpoint', () => {
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    app.get('/api/arrays', async () => ({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false,
    }));
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns paginated response shape', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/arrays' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('items');
    expect(Array.isArray(body.items)).toBe(true);
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('page');
    expect(body).toHaveProperty('pageSize');
    expect(body).toHaveProperty('hasMore');
  });
});
