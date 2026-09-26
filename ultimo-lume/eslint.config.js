// Minimal lint config: catches undefined names, unused vars and common mistakes.
export default [
  {
    files: ['src/**/*.js', 'tools/**/*.js', 'tools/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly', document: 'readonly', navigator: 'readonly', location: 'readonly', console: 'readonly',
        requestAnimationFrame: 'readonly', setTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly',
        performance: 'readonly', URLSearchParams: 'readonly', process: 'readonly', URL: 'readonly',
      },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { args: 'none' }],
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-const-assign': 'error',
      'no-self-assign': 'error',
      'no-redeclare': 'error',
    },
  },
];
