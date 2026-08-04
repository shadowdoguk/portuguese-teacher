// ESLint flat config — greenfield Portuguese Teacher.
//
// Amendment Task A1 (cross-cutting, must land with Task 1 of the Phase A plan):
// rejects every import whose specifier resolves under legacy/**. The archive is
// read-only reference material; new code never reaches into it (see legacy/README.md
// and ADR-0001 / ADR-0002 for the boundary).

import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.next/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/legacy/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: 'module',
      },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/legacy/**', '**/legacy'],
              message:
                'legacy/ is archived reference material (see legacy/README.md). ' +
                'Do not import from it; copy the pattern you need into a new module.',
            },
          ],
        },
      ],
    },
  },
];
