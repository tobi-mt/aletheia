import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Capacitor platform projects contain generated web bundles and native build
    // intermediates. They are validated by their respective platform toolchains,
    // not by the TypeScript/Next.js lint pass.
    "android/**",
    "ios/**",
    "capacitor-web/**",
  ]),
]);

export default eslintConfig;
