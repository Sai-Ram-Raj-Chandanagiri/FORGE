/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@forge/db$": "<rootDir>/src/__mocks__/@forge/db.ts",
    "^@forge/shared(.*)$": "<rootDir>/../../packages/shared/src$1",
    "^@forge/auth(.*)$": "<rootDir>/../../packages/auth/src$1",
    "^@forge/logger(.*)$": "<rootDir>/../../packages/logger/src$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          module: "commonjs",
          moduleResolution: "node",
          noUncheckedIndexedAccess: false,
          paths: {
            "@/*": ["./src/*"],
          },
        },
      },
    ],
  },
  collectCoverageFrom: [
    "src/server/services/**/*.ts",
    "!src/**/*.d.ts",
  ],
};
