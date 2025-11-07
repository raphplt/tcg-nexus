import { nextJsConfig } from "@repo/eslint-config/next-js";
import unusedImports from "eslint-plugin-unused-imports";

/** @type {import("eslint").Linter.Config} */
export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "*.config.js",
      "*.config.mjs",
      "*.config.ts",
    ],
  },
  ...nextJsConfig,
  {
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      // Désactiver la règle qui bloque les types 'any'
      "@typescript-eslint/no-explicit-any": "off",
      // Désactiver la règle par défaut pour les variables non utilisées
      "@typescript-eslint/no-unused-vars": "off",
      // Utiliser le plugin unused-imports pour supprimer automatiquement les imports non utilisés
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      // Permettre les patterns vides si préfixés par _
      "no-empty-pattern": "off",
      // Désactiver les règles React qui sont trop strictes
      "react/no-unescaped-entities": "off",
      "react/prop-types": "off",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "warn",
      // Désactiver les warnings Next.js sur les images
      "@next/next/no-img-element": "off",
    },
  },
];
