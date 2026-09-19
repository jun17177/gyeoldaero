/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      // 알고리즘·유틸(순수함수) — RN 런타임 없이 빠르게 돈다. 파일명 *.test.ts
      displayName: 'logic',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/src'],
      testMatch: ['**/__tests__/**/*.test.ts'],
    },
    {
      // 화면·컴포넌트 렌더 — Expo 런타임이 필요하다. 파일명 *.test.tsx
      displayName: 'ui',
      preset: 'jest-expo',
      roots: ['<rootDir>/src'],
      testMatch: ['**/__tests__/**/*.test.tsx'],
    },
  ],
};
