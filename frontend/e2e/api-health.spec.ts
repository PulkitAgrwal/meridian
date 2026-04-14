import { test, expect } from '@playwright/test';

const API_BASE = process.env.API_BASE || 'http://localhost:8080';

test.describe('API Health Checks', () => {
  test('GET /health returns 200', async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.agent).toBe('chainsight_orchestrator');
  });

  test('GET /api/v1/corridors returns 3 corridors', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/corridors`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('corridors');
    expect(body).toHaveProperty('source');
    const corridorIds = Object.keys(body.corridors);
    expect(corridorIds).toContain('asia-europe');
    expect(corridorIds).toContain('us-india');
    expect(corridorIds).toContain('intra-india');
    expect(corridorIds.length).toBe(3);
  });

  test('GET /api/v1/reasoning returns array', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/reasoning`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('total_steps');
    expect(body).toHaveProperty('steps');
    expect(Array.isArray(body.steps)).toBe(true);
  });

  test('POST /api/v1/query with body returns response (not 500)', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/v1/query`, {
      data: { query: 'hello' },
    });
    // Should get 200 or 429 (rate limit), but NOT 500
    expect(response.status()).not.toBe(500);
    const body = await response.json();
    // Response could have 'query' field on success, or 'error'/'detail' on rate limit
    const hasExpectedField = body.query !== undefined || body.error !== undefined || body.detail !== undefined;
    expect(hasExpectedField).toBe(true);
  });

  test('GET /api/v1/disruptions returns valid JSON', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/disruptions`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('events');
    expect(Array.isArray(body.events)).toBe(true);
  });
});
