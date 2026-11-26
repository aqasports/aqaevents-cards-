// ESLint flat config for the AQA Coaches app (Expo's recommended setup).
// Needs the dev packages `eslint` and `eslint-config-expo`; run `npm run lint` after installing them.
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/*", "node_modules/*"],
  },
]);
