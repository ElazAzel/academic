import next from "eslint-config-next";
import coreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...next,
  ...coreWebVitals,
  {
    rules: {
      // Custom overrides if needed
    },
  },
  {
    ignores: ["coverage/**", "scratch/**", "types/**/*.d.ts", "open-design/**"],
  },
];

export default eslintConfig;
