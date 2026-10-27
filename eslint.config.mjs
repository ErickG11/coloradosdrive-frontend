import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";

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
    "coverage/**",
    // Herramientas locales y artefactos del navegador: no son código de la app.
    ".agents/**",
    ".playwright-cli/**",
    ".local-auth/**",
  ]),
  // Debe ir al final: desactiva reglas de estilo de ESLint que
  // compiten con Prettier.
  eslintConfigPrettier,
]);

export default eslintConfig;
