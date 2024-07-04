import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { globalOption, ParameterType } from "../../src/config.js";
import {
  buildGlobalOptionsMap,
  buildGlobalOptionDefinition,
  resolveGlobalOptions,
} from "../../src/internal/global-options.js";
import { RESERVED_PARAMETER_NAMES } from "../../src/internal/parameters.js";
import { createTestEnvManager } from "../utils.js";

describe("Global Options", () => {
  before(() => {
    // Make sure we have some reserved names
    RESERVED_PARAMETER_NAMES.add("testName1");
    RESERVED_PARAMETER_NAMES.add("testName2");
    RESERVED_PARAMETER_NAMES.add("testName3");
  });

  after(() => {
    // Delete the test reserved names
    RESERVED_PARAMETER_NAMES.delete("testName1");
    RESERVED_PARAMETER_NAMES.delete("testName2");
    RESERVED_PARAMETER_NAMES.delete("testName3");
  });

  describe("buildGlobalOptionsMap", () => {
    it("should build an empty map of global options if no plugins are provided", () => {
      const globalOptionsMap = buildGlobalOptionsMap([]);

      assert.deepEqual(globalOptionsMap, new Map());
    });

    it("should build an empty map of global options if there are no global options defined by plugins", () => {
      const globalOptionsMap = buildGlobalOptionsMap([
        {
          id: "plugin1",
        },
      ]);

      assert.deepEqual(globalOptionsMap, new Map());
    });

    it("should build a map of global options", () => {
      const globalOptionDefinition = globalOption({
        name: "param1",
        description: "param1 description",
        type: ParameterType.BOOLEAN,
        defaultValue: true,
      });
      const globalOptionsMap = buildGlobalOptionsMap([
        {
          id: "plugin1",
          globalOptions: [globalOptionDefinition],
        },
      ]);

      assert.ok(
        globalOptionsMap.has("param1"),
        "Expected 'param1' to be defined in the global options map",
      );
      assert.deepEqual(
        globalOptionsMap.get("param1")?.option,
        globalOptionDefinition,
      );
      assert.deepEqual(globalOptionsMap.get("param1")?.pluginId, "plugin1");
    });

    it("should throw if a global option is already defined by another plugin", () => {
      const globalOptionDefinition = globalOption({
        name: "param1",
        description: "param1 description",
        type: ParameterType.BOOLEAN,
        defaultValue: true,
      });
      const globalOptionDefinition2 = globalOption({
        name: "param1",
        description: "param1 description 2",
        type: ParameterType.BOOLEAN,
        defaultValue: false,
      });

      assert.throws(
        () =>
          buildGlobalOptionsMap([
            {
              id: "plugin1",
              globalOptions: [globalOptionDefinition],
            },
            {
              id: "plugin2",
              globalOptions: [globalOptionDefinition2],
            },
          ]),
        new HardhatError(
          HardhatError.ERRORS.GENERAL.GLOBAL_OPTION_ALREADY_DEFINED,
          {
            plugin: "plugin2",
            globalOption: "param1",
            definedByPlugin: "plugin1",
          },
        ),
      );
    });

    it("should throw if an option name is not valid", () => {
      assert.throws(
        () =>
          buildGlobalOptionsMap([
            {
              id: "plugin1",
              globalOptions: [
                globalOption({
                  name: "foo bar",
                  description: "Foo description",
                  type: ParameterType.STRING,
                  defaultValue: "bar",
                }),
              ],
            },
          ]),
        new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_NAME, {
          name: "foo bar",
        }),
      );
    });

    it("should throw if an option name is reserved", () => {
      RESERVED_PARAMETER_NAMES.forEach((name) => {
        assert.throws(
          () =>
            buildGlobalOptionsMap([
              {
                id: "plugin1",
                globalOptions: [
                  globalOption({
                    name,
                    description: "Foo description",
                    type: ParameterType.STRING,
                    defaultValue: "bar",
                  }),
                ],
              },
            ]),
          new HardhatError(HardhatError.ERRORS.ARGUMENTS.RESERVED_NAME, {
            name,
          }),
        );
      });
    });

    it("should throw if an options default value does not match the type", () => {
      assert.throws(
        () =>
          buildGlobalOptionsMap([
            {
              id: "plugin1",
              globalOptions: [
                globalOption({
                  name: "foo",
                  description: "Foo description",
                  type: ParameterType.BOOLEAN,
                  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
                  Intentionally testing an invalid type */
                  defaultValue: "bar" as any,
                }),
              ],
            },
          ]),
        new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
          value: "bar",
          name: "defaultValue",
          type: ParameterType.BOOLEAN,
        }),
      );
    });
  });

  describe("buildGlobalOptionDefinition", () => {
    it("should build a global option definition", () => {
      const options = {
        name: "foo",
        description: "Foo description",
        type: ParameterType.BOOLEAN,
        defaultValue: true,
      };
      const globalOptionDefinition = buildGlobalOptionDefinition(options);

      assert.deepEqual(globalOptionDefinition, options);
    });

    it("should build a global option definition with a default type of STRING", () => {
      const options = {
        name: "foo",
        description: "Foo description",
        defaultValue: "bar",
      };
      const globalOptionDefinition = buildGlobalOptionDefinition(options);

      assert.deepEqual(globalOptionDefinition, {
        ...options,
        type: ParameterType.STRING,
      });
    });

    it("should throw if the option name is not valid", () => {
      assert.throws(
        () =>
          buildGlobalOptionDefinition({
            name: "foo bar",
            description: "Foo description",
            defaultValue: "bar",
          }),
        new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_NAME, {
          name: "foo bar",
        }),
      );
    });

    it("should throw if the option name is reserved", () => {
      RESERVED_PARAMETER_NAMES.forEach((name) => {
        assert.throws(
          () =>
            buildGlobalOptionDefinition({
              name,
              description: "Foo description",
              defaultValue: "bar",
            }),
          new HardhatError(HardhatError.ERRORS.ARGUMENTS.RESERVED_NAME, {
            name,
          }),
        );
      });
    });

    it("should throw if the default value does not match the type", () => {
      assert.throws(
        () =>
          buildGlobalOptionDefinition({
            name: "foo",
            description: "Foo description",
            type: ParameterType.BOOLEAN,
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
            Intentionally testing an invalid type */
            defaultValue: "bar" as any,
          }),
        new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
          value: "bar",
          name: "defaultValue",
          type: ParameterType.BOOLEAN,
        }),
      );
    });
  });

  describe("resolveGlobalOptions", () => {
    const { setEnvVar } = createTestEnvManager();

    it("should resolve to the default values when no options are provided", () => {
      const globalOptionsMap = buildGlobalOptionsMap([
        {
          id: "plugin1",
          globalOptions: [
            buildGlobalOptionDefinition({
              name: "param1",
              description: "param1 description",
              type: ParameterType.BOOLEAN,
              defaultValue: true,
            }),
            buildGlobalOptionDefinition({
              name: "param2",
              description: "param2 description",
              defaultValue: "default",
            }),
          ],
        },
      ]);

      const globalOptions = resolveGlobalOptions({}, globalOptionsMap);

      assert.deepEqual(globalOptions, {
        param1: true,
        param2: "default",
      });
    });

    it("should resolve to the user provided options and env variables", () => {
      const globalOptionsMap = buildGlobalOptionsMap([
        {
          id: "plugin1",
          globalOptions: [
            buildGlobalOptionDefinition({
              name: "param1",
              description: "param1 description",
              type: ParameterType.BOOLEAN,
              defaultValue: true,
            }),
            buildGlobalOptionDefinition({
              name: "param2",
              description: "param2 description",
              defaultValue: "default",
            }),
            buildGlobalOptionDefinition({
              name: "param3",
              description: "param3 description",
              type: ParameterType.BIGINT,
              defaultValue: 0n,
            }),
          ],
        },
      ]);

      setEnvVar("HARDHAT_PARAM3", "5n");

      const globalOptions = resolveGlobalOptions(
        {
          param1: false,
          param2: "user",
        },
        globalOptionsMap,
      );

      assert.deepEqual(globalOptions, {
        param1: false,
        param2: "user",
        param3: 5n,
      });
    });

    it("should resolve to the user provided options over the environment variables", () => {
      const globalOptionsMap = buildGlobalOptionsMap([
        {
          id: "plugin1",
          globalOptions: [
            buildGlobalOptionDefinition({
              name: "param1",
              description: "param1 description",
              type: ParameterType.BOOLEAN,
              defaultValue: true,
            }),
            buildGlobalOptionDefinition({
              name: "param2",
              description: "param2 description",
              defaultValue: "default",
            }),
          ],
        },
      ]);

      setEnvVar("HARDHAT_PARAM2", "env");

      const globalOptions = resolveGlobalOptions(
        {
          param1: false,
          param2: "user",
        },
        globalOptionsMap,
      );

      assert.deepEqual(globalOptions, {
        param1: false,
        param2: "user",
      });
    });

    it("should ignore options that are not defined in the global option map", () => {
      const globalOptionsMap = buildGlobalOptionsMap([
        {
          id: "plugin1",
          globalOptions: [
            buildGlobalOptionDefinition({
              name: "param1",
              description: "param1 description",
              type: ParameterType.BOOLEAN,
              defaultValue: true,
            }),
          ],
        },
      ]);

      setEnvVar("HARDHAT_PARAM3", "env");

      const globalOptions = resolveGlobalOptions(
        {
          param1: false,
          param2: "user",
        },
        globalOptionsMap,
      );

      assert.deepEqual(globalOptions, {
        param1: false,
      });
    });

    it("should throw if the environment variable is not valid", () => {
      const globalOptionsMap = buildGlobalOptionsMap([
        {
          id: "plugin1",
          globalOptions: [
            buildGlobalOptionDefinition({
              name: "param1",
              description: "param1 description",
              type: ParameterType.BOOLEAN,
              defaultValue: true,
            }),
          ],
        },
      ]);

      setEnvVar("HARDHAT_PARAM1", "not a boolean");

      assert.throws(
        () => resolveGlobalOptions({}, globalOptionsMap),
        new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_VALUE_FOR_TYPE, {
          value: "not a boolean",
          name: "param1",
          type: ParameterType.BOOLEAN,
        }),
      );
    });
  });
});
