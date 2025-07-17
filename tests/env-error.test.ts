import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";

/**
 * This test file ensures that the application's environment validation logic in src/env.ts
 * correctly handles invalid environment variables at runtime. Unlike env.test.ts, which tests
 * the Zod schema validation in isolation, this file tests the real-world behavior when the
 * application is started with invalid environment variables. It verifies that:
 *   - The process exits with code 1 when validation fails
 *   - The correct error messages are logged to the console
 *   - The validation is triggered during module import (simulating app startup)
 *
 * This is achieved by mocking process.exit and console.error, and using dynamic import to
 * trigger the validation logic in src/env.ts. This test complements env.test.ts by ensuring
 * the application's startup error handling works as intended.
 */

describe("env error handling", () => {
  // Mock console.error and process.exit
  const consoleErrorMock = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});
  const processExitMock = vi
    .spyOn(process, "exit")
    .mockImplementation((code) => {
      return code as never; // TypeScript expects this function to never return
    });

  // Create a backup of process.env and restore it after each test
  let envBackup: NodeJS.ProcessEnv;

  beforeEach(() => {
    envBackup = { ...process.env };

    // Clear mocks before each test
    consoleErrorMock.mockClear();
    processExitMock.mockClear();
  });

  afterEach(() => {
    // Restore the original process.env
    process.env = envBackup;
  });

  it("should exit with code 1 when environment variables are invalid", async () => {
    // Reset potential cached module
    vi.resetModules();

    // Set an invalid value for FRONTEND_URL (which has URL validation)
    process.env.FRONTEND_URL = "not-a-valid-url";

    // Import env.ts - this will trigger the validation logic
    // We need to use dynamic import to avoid the validation running at module load time
    try {
      await import("../src/env");
    } catch (error) {
      // If it throws, that's expected since process.exit is mocked
    }

    // Verify console.error was called twice
    expect(consoleErrorMock).toHaveBeenCalledTimes(2);
    expect(consoleErrorMock.mock.calls[0][0]).toBe(
      "❌ Invalid environment variables after mapping:",
    );
    expect(consoleErrorMock.mock.calls[1][0]).toBe(
      "Mapped environment data passed to Zod:",
    );

    // Verify process.exit was called with code 1
    expect(processExitMock).toHaveBeenCalledWith(1);
  });
});
