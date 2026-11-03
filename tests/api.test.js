import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('KyU Connect API Endpoints', () => {
  it('GET / returns API root info', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.health).toBe('/api/v1/health');
  });

  it('GET /api/v1/posts/trending returns trending campus tags', async () => {
    const res = await request(app).get('/api/v1/posts/trending');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/v1/search handles query correctly', async () => {
    const res = await request(app).get('/api/v1/search?q=innovation');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/v1/posts rejects unauthorized requests', async () => {
    const res = await request(app)
      .post('/api/v1/posts')
      .send({ body: 'Hello campus!' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/issues rejects unauthorized requests', async () => {
    const res = await request(app)
      .post('/api/v1/issues')
      .send({ title: 'Street light broken', location: 'Gate', description: 'Dark path' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/login validates required fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'notanemail' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/register validates password length', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'student@kyu.ac.ke',
        password: 'short',
        name: 'Test Student',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

