/**
 * Load Tests using k6
 * Install: https://k6.io/docs/getting-started/installation/
 * Run: k6 run load-tests/api-load.js
 *
 * Scenarios:
 * - auth_smoke: Quick smoke test (1 VU, 10s)
 * - auth_load: Load test auth endpoints (10 VUs, 1m)
 * - api_load: Load test protected API endpoints (20 VUs, 2m)
 */
import http from 'k6/http';
import { sleep, check, group } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3333';

// Custom metrics
const authSuccess = new Rate('auth_success_rate');
const apiLatency = new Trend('api_latency_ms');
const errorCount = new Counter('error_count');

export const options = {
  scenarios: {
    auth_smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '10s',
      tags: { scenario: 'smoke' },
    },
    auth_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 5 },
        { duration: '30s', target: 10 },
        { duration: '15s', target: 0 },
      ],
      tags: { scenario: 'auth_load' },
      startTime: '15s',
    },
    api_concurrent: {
      executor: 'constant-vus',
      vus: 20,
      duration: '1m',
      tags: { scenario: 'api_load' },
      startTime: '1m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'],
    auth_success_rate: ['rate>0.95'],
  },
};

// Test credentials (configure via env vars for real tests)
const TEST_EMAIL = __ENV.TEST_EMAIL || 'loadtest@example.com';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'LoadTest123';

let authToken = null;

export function setup() {
  // Login once to get token for load tests
  const loginRes = http.post(`${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: TEST_EMAIL, senha: TEST_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    return { token: body.token };
  }

  console.warn('Setup login failed - load tests requiring auth will skip');
  return { token: null };
}

export default function (data) {
  const token = data?.token;
  const headers = { 'Content-Type': 'application/json' };
  const authHeaders = token
    ? { ...headers, Authorization: `Bearer ${token}` }
    : headers;

  group('Auth Endpoints', () => {
    // Test login
    const loginStart = Date.now();
    const loginRes = http.post(`${BASE_URL}/api/auth/login`,
      JSON.stringify({ email: TEST_EMAIL, senha: TEST_PASSWORD }),
      { headers }
    );
    apiLatency.add(Date.now() - loginStart);

    const loginOk = check(loginRes, {
      'login status is 200 or 401': (r) => [200, 401].includes(r.status),
      'login response is JSON': (r) => r.headers['Content-Type']?.includes('application/json'),
    });
    authSuccess.add(loginRes.status === 200);
    if (loginRes.status >= 500) errorCount.add(1);

    sleep(0.5);

    // Test forgot-password (anti-enumeration - always 200)
    const forgotRes = http.post(`${BASE_URL}/api/auth/forgot-password`,
      JSON.stringify({ email: 'any@example.com' }),
      { headers }
    );

    check(forgotRes, {
      'forgot-password does not enumerate': (r) => r.status === 200,
    });

    sleep(1);
  });

  if (token) {
    group('Protected API Endpoints', () => {
      // GET /api/properties
      const propStart = Date.now();
      const propertiesRes = http.get(`${BASE_URL}/api/properties`, { headers: authHeaders });
      apiLatency.add(Date.now() - propStart);

      check(propertiesRes, {
        'properties list status OK': (r) => [200, 403].includes(r.status),
        'properties response time < 1s': (r) => r.timings.duration < 1000,
      });
      if (propertiesRes.status >= 500) errorCount.add(1);

      sleep(0.3);

      // GET /api/tenants
      const tenantsRes = http.get(`${BASE_URL}/api/tenants`, { headers: authHeaders });
      check(tenantsRes, {
        'tenants list OK': (r) => [200, 403].includes(r.status),
      });

      sleep(0.3);

      // GET /api/reservations
      const reservationsRes = http.get(`${BASE_URL}/api/reservations`, { headers: authHeaders });
      check(reservationsRes, {
        'reservations list OK': (r) => [200, 403].includes(r.status),
      });

      sleep(0.3);

      // GET /api/dashboard/stats
      const dashboardRes = http.get(`${BASE_URL}/api/dashboard/stats`, { headers: authHeaders });
      check(dashboardRes, {
        'dashboard stats OK': (r) => [200, 403].includes(r.status),
        'dashboard response time < 2s': (r) => r.timings.duration < 2000,
      });

      sleep(0.5);
    });
  }

  group('Public Endpoints', () => {
    // Public calendar export (no auth)
    const publicCalRes = http.get(`${BASE_URL}/api/public/calendar/nonexistent/export.ics`);
    check(publicCalRes, {
      'public ics returns 4xx or 2xx (not 5xx)': (r) => r.status < 500,
    });

    sleep(0.2);
  });
}

export function teardown(data) {
  console.log(`Load test complete. Auth token was: ${data?.token ? 'available' : 'not available'}`);
}
