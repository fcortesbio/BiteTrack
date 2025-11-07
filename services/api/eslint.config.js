import js from '@eslint/js';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Apply to all JavaScript files
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // ESLint recommended rules
      ...js.configs.recommended.rules,
      
      // Code quality rules (non-formatting)
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      
      // Best practices
      'no-throw-literal': 'error',
      'prefer-arrow-callback': 'error',
      'no-duplicate-imports': 'error',
      'no-useless-return': 'error',
      
      // Error handling - Node.js style
      'no-process-exit': 'error',
      'no-sync': 'warn',
      
      // Disable all formatting rules (handled by Prettier)
      ...prettierConfig.rules,
    },
  },
  
  // Configuration for test files
  {
    files: ['**/*.test.js', '**/tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
        jest: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        testUtils: 'readonly', // Global test utilities from setup.js
      },
    },
    rules: {
      'no-console': 'off', // Allow console in tests
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-sync': 'off', // Test files can use sync operations
    },
  },
  
  // Configuration for config files
  {
    files: ['eslint.config.js', 'config/**/*.js'],
    rules: {
      'no-console': 'off',
    },
  },
  
  // Configuration for CLI scripts and main entry point
  {
    files: [
      'create-superadmin.js',
      'index.js',
      'scripts/**/*.js',
    ],
    rules: {
      'no-console': 'off',
      'no-process-exit': 'off', // CLI scripts need to exit
    },
  },
  
  // Configuration for middleware and controllers that need console for debugging
  {
    files: [
      'middleware/errorHandler.js',
      'controllers/**/*.js',
    ],
    rules: {
      'no-console': 'off', // Controllers and error handlers use console for debugging
    },
  },
  
  
  // Global ignores
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'build/**',
      '.env*',
      '!.env.example',
      'logs/**',
      '*.log',
      'tmp/**',
      'temp/**',
      'package-lock.json',
      'yarn.lock',
      'docs/postman-collection.json',
    ],
  },
];