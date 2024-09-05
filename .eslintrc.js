module.exports = {
    extends: ["eslint:recommended", "prettier"],
    plugins: ["import", "prettier", "unused-imports", "playwright"],
    globals: {
      React: true,
      JSX: true,
    },
    env: {
      node: true,
      browser: true
    },
    ignorePatterns: [
      ".*.js",
      "node_modules/",
      "dist/",
      "extension-src/",
      "playwright-report/",
      "test-results/"
    ],
    overrides: [
      {
        files: ["*.js?(x)", "*.ts?(x)"],
      },
    ],
    parser: "@typescript-eslint/parser",
    rules: {
      "prettier/prettier": ["error"],
      "import/no-duplicates": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-imports": "error",
      "no-empty-pattern": "off",
      "unused-imports/no-unused-vars": [
        "error",
        { "vars": "all", "varsIgnorePattern": "^_", "args": "after-used", "argsIgnorePattern": "^_" }
      ]
    }
  };