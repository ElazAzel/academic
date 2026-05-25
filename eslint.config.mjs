import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.config({
    extends: ["next/core-web-vitals", "next/typescript", "plugin:jsx-a11y/recommended"],
    ignorePatterns: [".next/**", "node_modules/**", "coverage/**", "dist/**", "scratch/**", "types/**/*.d.ts"],
    rules: {
      // AppShell использует role как кастомный проп (не DOM-атрибут).
      // Компонент не форвардит его в DOM — false positive линтера.
      "jsx-a11y/aria-role": ["warn", { ignoreNonDOM: true }],

      // Формы используют <label>Thing<Input /></label> с кастомными ui-компонентами.
      // Ассоциация через nesting корректна для скринридеров.
      "jsx-a11y/label-has-associated-control": ["error", { assert: "either" }],
    },
  }),
];

export default eslintConfig;
