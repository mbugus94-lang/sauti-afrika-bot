import { describe, it, expect } from 'vitest';

describe('Health Check', () => {
  it('should return health status', async () => {
    const response = await fetch('http://localhost:3000/health');
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
    expect(data.uptime).toBeDefined();
    expect(typeof data.uptime).toBe('number');
  });
});
