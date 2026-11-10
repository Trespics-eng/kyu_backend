import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('KyU AI Intelligence Module Endpoints', () => {
  it('GET /api/v1/ai/dashboard returns dashboard metrics and settings', async () => {
    const res = await request(app).get('/api/v1/ai/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('metrics');
    expect(res.body.data.metrics).toHaveProperty('targetToday', 5);
  }, 15000);

  it('GET /api/v1/ai/agents returns the agents list', async () => {
    const res = await request(app).get('/api/v1/ai/agents');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/v1/ai/sources returns monitored sources', async () => {
    const res = await request(app).get('/api/v1/ai/sources');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/v1/ai/pause halts publishing', async () => {
    const res = await request(app).post('/api/v1/ai/pause').send({ reason: 'Emergency test pause' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/v1/ai/resume restores publishing', async () => {
    const res = await request(app).post('/api/v1/ai/resume');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

