/**
 * Lighthouse CI configuration for AI Strategic Academy.
 *
 * Defines performance budgets and Lighthouse audit thresholds that must be met
 * before a release can proceed. The budgets are tracked in CI (Lighthouse CI)
 * and can also be run locally with:
 *   npx lhci autorun
 *
 * @see https://github.com/GoogleChrome/lighthouse-ci
 */
module.exports = {
  ci: {
    collect: {
      startServerCommand: "npm run start",
      startServerReadyPattern: "Ready in",
      url: [
        "http://127.0.0.1:3000/",
        "http://127.0.0.1:3000/login",
        "http://127.0.0.1:3000/student/my-courses",
        "http://127.0.0.1:3000/admin",
        "http://127.0.0.1:3000/instructor",
      ],
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
        throttlingMethod: "simulate",
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouse-reports",
    },
    assert: {
      assertions: {
        /* Performance metrics */
        "categories:performance": ["warn", { minScore: 0.8 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],

        /* Core Web Vitals */
        "largest-contentful-paint": ["warn", { maxNumericValue: 2500 }],
        "total-blocking-time": ["warn", { maxNumericValue: 200 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],

        /* Asset budgets */
        "resource-summary:javascript:total": ["error", { maxNumericValue: 400_000 }],
        "resource-summary:document:total": ["error", { maxNumericValue: 50_000 }],
        "resource-summary:font:total": ["error", { maxNumericValue: 150_000 }],

        /* Best practices */
        "uses-responsive-images": "error",
        "deprecations": "error",
        "errors-in-console": "error",
        "no-document-write": "error",
        "uses-http2": "warn",

        /* Accessibility must-haves (WCAG 2.1 AA) */
        "aria-allowed-attr": "error",
        "aria-required-attr": "error",
        "aria-required-children": "error",
        "aria-required-parent": "error",
        "aria-roles": "error",
        "aria-valid-attr-value": "error",
        "aria-valid-attr": "error",
        "button-name": "error",
        "color-contrast": "error",
        "document-title": "error",
        "duplicate-id-active": "error",
        "html-has-lang": "error",
        "image-alt": "error",
        "input-button-name": "error",
        "label": "error",
        "link-name": "error",
        "list": "error",
        "meta-viewport": "error",
        "tabindex": "error",
        "valid-lang": "error",
        "video-caption": "warn",
      },
    },
  },
};
