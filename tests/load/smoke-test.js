// k6 smoke test — AI Strategic Academy
// Usage: k6 run tests/load/smoke-test.js
// Simulates 2000 concurrent users with gradual ramp-up

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

const errorRate = new Rate("errors");
const apiLatency = new Trend("api_latency");

export const options = {
  stages: [
    { target: 200, duration: "30s" },  // Ramp up to 200 users
    { target: 1000, duration: "1m" },   // Ramp to 1000
    { target: 2000, duration: "1m" },   // Ramp to 2000 peak
    { target: 1000, duration: "30s" },  // Scale down
    { target: 0, duration: "30s" },     // Cool down
  ],
  thresholds: {
    errors: ["rate<0.01"],              // <1% error rate
    http_req_duration: ["p(95)<2000"], // 95% requests under 2s
    api_latency: ["p(95)<500"],        // API-specific: 95% under 500ms
  },
};

export default function () {
  group("API Health Check", () => {
    const res = http.get(`${BASE_URL}/api/v1/healthz`);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);
    check(res, {
      "health endpoint returns 200": (r) => r.status === 200,
    });
  });

  sleep(1);

  group("API Readiness", () => {
    const res = http.get(`${BASE_URL}/api/v1/readyz`);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);
    check(res, {
      "readiness endpoint returns 200": (r) => r.status === 200,
    });
  });

  sleep(2);

  group("Static Pages", () => {
    const res = http.get(`${BASE_URL}/`);
    check(res, {
      "main page loads": (r) => r.status === 200,
    });
  });

  sleep(2);
}
