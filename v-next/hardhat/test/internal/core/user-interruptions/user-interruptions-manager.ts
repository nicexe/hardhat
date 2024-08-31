import type { UserInterruptionHooks } from "../../../../src/types/hooks.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { HookManagerImplementation } from "../../../../src/internal/core/hook-manager.js";
import { resolveProjectRoot } from "../../../../src/internal/core/hre.js";
import { UserInterruptionManagerImplementation } from "../../../../src/internal/core/user-interruptions.js";

describe("UserInterruptionManager", () => {
  let projectRoot: string;

  before(async () => {
    projectRoot = await resolveProjectRoot(process.cwd());
  });

  describe("displayMessage", () => {
    it("Should call a dynamic handler with a given message from an interruptor", async () => {
      const hookManager = new HookManagerImplementation(projectRoot, []);
      const userInterruptionManager = new UserInterruptionManagerImplementation(
        hookManager,
      );

      // TODO: Setting the context like this is a bit fragile. If this test
      // breaks we should probably switch to initializing an entire HRE in these
      // tests.
      hookManager.setContext({
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions  --
        TODO: This is a temporary fix to land a refactor sooner without creating
        more merge conflicts than needed. It will be fixed in a subsequent PR */
        config: {
          tasks: [],
          plugins: [],
          paths: {
            root: projectRoot,
            cache: "",
            artifacts: "",
            tests: "",
          },
        } as any,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions  --
        TODO: This is a temporary fix to land a refactor sooner without creating
        more merge conflicts than needed. It will be fixed in a subsequent PR */
        globalOptions: {} as any,
        hooks: hookManager,
        interruptions: userInterruptionManager,
      });

      let called = false;
      let givenInterruptor: string = "";
      let givenMessage: string = "";

      const handlers: Partial<UserInterruptionHooks> = {
        async displayMessage(_context, interruptor, message) {
          called = true;
          givenInterruptor = interruptor;
          givenMessage = message;
        },
      };

      hookManager.registerHandlers("userInterruptions", handlers);

      await userInterruptionManager.displayMessage(
        "test-interruptor",
        "test-message",
      );

      assert(called, "Handler was not called");
      assert.equal(givenInterruptor, "test-interruptor");
      assert.equal(givenMessage, "test-message");
    });
  });

  describe("requestInput", () => {
    it("Should call a dynamic handler with a given input description from an interruptor", async () => {
      const hookManager = new HookManagerImplementation(projectRoot, []);
      const userInterruptionManager = new UserInterruptionManagerImplementation(
        hookManager,
      );
      hookManager.setContext({
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions  --
        TODO: This is a temporary fix to land a refactor sooner without creating
        more merge conflicts than needed. It will be fixed in a subsequent PR */
        config: {
          tasks: [],
          plugins: [],
          paths: {
            root: projectRoot,
            cache: "",
            artifacts: "",
            tests: "",
          },
        } as any,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions  --
        TODO: This is a temporary fix to land a refactor sooner without creating
        more merge conflicts than needed. It will be fixed in a subsequent PR */
        globalOptions: {} as any,
        hooks: hookManager,
        interruptions: userInterruptionManager,
      });

      let called = false;
      let givenInterruptor: string = "";
      let givenInputDescription: string = "";

      const handlers: Partial<UserInterruptionHooks> = {
        async requestInput(_context, interruptor, inputDescription) {
          called = true;
          givenInterruptor = interruptor;
          givenInputDescription = inputDescription;
          return "test-input";
        },
      };

      hookManager.registerHandlers("userInterruptions", handlers);

      const input = await userInterruptionManager.requestInput(
        "test-interruptor",
        "test-input-description",
      );

      assert(called, "Handler was not called");
      assert.equal(givenInterruptor, "test-interruptor");
      assert.equal(givenInputDescription, "test-input-description");
      assert.equal(input, "test-input");
    });
  });

  describe("requestSecretInput", () => {
    it("Should call a dynamic handler with a given input description from an interruptor", async () => {
      const hookManager = new HookManagerImplementation(projectRoot, []);
      const userInterruptionManager = new UserInterruptionManagerImplementation(
        hookManager,
      );
      hookManager.setContext({
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions  --
        TODO: This is a temporary fix to land a refactor sooner without creating
        more merge conflicts than needed. It will be fixed in a subsequent PR */
        config: {
          tasks: [],
          plugins: [],
          paths: {
            root: projectRoot,
            cache: "",
            artifacts: "",
            tests: "",
          },
        } as any,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions  --
        TODO: This is a temporary fix to land a refactor sooner without creating
        more merge conflicts than needed. It will be fixed in a subsequent PR */
        globalOptions: {} as any,
        hooks: hookManager,
        interruptions: userInterruptionManager,
      });

      let called = false;
      let givenInterruptor: string = "";
      let givenInputDescription: string = "";

      const handlers: Partial<UserInterruptionHooks> = {
        async requestSecretInput(_context, interruptor, inputDescription) {
          called = true;
          givenInterruptor = interruptor;
          givenInputDescription = inputDescription;
          return "test-secret-input";
        },
      };

      hookManager.registerHandlers("userInterruptions", handlers);

      const input = await userInterruptionManager.requestSecretInput(
        "test-interruptor",
        "test-input-description",
      );

      assert(called, "Handler was not called");
      assert.equal(givenInterruptor, "test-interruptor");
      assert.equal(givenInputDescription, "test-input-description");
      assert.equal(input, "test-secret-input");
    });
  });
});
