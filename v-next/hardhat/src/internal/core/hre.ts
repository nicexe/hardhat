import type { UnsafeHardhatRuntimeEnvironmentOptions } from "./types.js";
import type {
  HardhatUserConfig,
  HardhatConfig,
  ProjectPathsUserConfig,
  ProjectPathsConfig,
  TestPathsConfig,
  SourcePathsConfig,
} from "../../types/config.js";
import type {
  GlobalOptions,
  GlobalOptionDefinitions,
} from "../../types/global-options.js";
import type { HookContext, HookManager } from "../../types/hooks.js";
import type { HardhatRuntimeEnvironment } from "../../types/hre.js";
import type { NetworkManager } from "../../types/network.js";
import type { HardhatPlugin } from "../../types/plugins.js";
import type { TaskManager } from "../../types/tasks.js";
import type { UserInterruptionManager } from "../../types/user-interruptions.js";

import path from "node:path";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { findClosestPackageRoot } from "@ignored/hardhat-vnext-utils/package";

import { validateUserConfig } from "./config-validation.js";
import { ResolvedConfigurationVariableImplementation } from "./configuration-variables.js";
import {
  buildGlobalOptionDefinitions,
  resolveGlobalOptions,
} from "./global-options.js";
import { HookManagerImplementation } from "./hook-manager.js";
import { resolvePluginList } from "./plugins/resolve-plugin-list.js";
import { TaskManagerImplementation } from "./tasks/task-manager.js";
import { UserInterruptionManagerImplementation } from "./user-interruptions.js";

export class HardhatRuntimeEnvironmentImplementation
  implements HardhatRuntimeEnvironment
{
  // NOTE: This is a small architectural violation, as this shouldn't be needed
  // here, because it's added by a plugin. But as that plugin is builtin, its
  // type extensions also affect this module.
  public network!: NetworkManager;

  public static async create(
    inputUserConfig: HardhatUserConfig,
    userProvidedGlobalOptions: Partial<GlobalOptions>,
    projectRoot?: string,
    unsafeOptions?: UnsafeHardhatRuntimeEnvironmentOptions,
  ): Promise<HardhatRuntimeEnvironmentImplementation> {
    const resolvedProjectRoot = await resolveProjectRoot(projectRoot);

    const resolvedPlugins =
      unsafeOptions?.resolvedPlugins ??
      (await resolvePluginList(resolvedProjectRoot, inputUserConfig.plugins));

    const hooks = new HookManagerImplementation(
      resolvedProjectRoot,
      resolvedPlugins,
    );

    // extend user config:
    const extendedUserConfig = await runUserConfigExtensions(
      hooks,
      inputUserConfig,
    );

    // validate config
    const userConfigValidationErrors = await validateUserConfig(
      hooks,
      extendedUserConfig,
    );

    if (userConfigValidationErrors.length > 0) {
      throw new HardhatError(HardhatError.ERRORS.GENERAL.INVALID_CONFIG, {
        errors: `\t${userConfigValidationErrors
          .map(
            (error) =>
              `* Config error in config.${error.path.join(".")}: ${error.message}`,
          )
          .join("\n\t")}`,
      });
    }

    // Resolve config

    const resolvedConfig = await resolveUserConfig(
      resolvedProjectRoot,
      userProvidedGlobalOptions.config,
      hooks,
      resolvedPlugins,
      extendedUserConfig,
    );

    // We override the plugins and the proejct root, as we want to prevent
    // the plugins from changing them
    const config: HardhatConfig = {
      ...resolvedConfig,
      paths: {
        ...resolvedConfig.paths,
        root: resolvedProjectRoot,
      },
      plugins: resolvedPlugins,
    };

    const globalOptionDefinitions =
      unsafeOptions?.globalOptionDefinitions ??
      buildGlobalOptionDefinitions(resolvedPlugins);

    const globalOptions = resolveGlobalOptions(
      userProvidedGlobalOptions,
      globalOptionDefinitions,
    );

    // Set the HookContext in the hook manager so that non-config hooks can
    // use it

    const interruptions = new UserInterruptionManagerImplementation(hooks);

    const hookContext: HookContext = {
      hooks,
      config,
      globalOptions,
      interruptions,
    };

    hooks.setContext(hookContext);

    const hre = new HardhatRuntimeEnvironmentImplementation(
      extendedUserConfig,
      config,
      hooks,
      interruptions,
      globalOptions,
      globalOptionDefinitions,
    );

    await hooks.runSequentialHandlers("hre", "created", [hre]);

    return hre;
  }

  public readonly tasks: TaskManager;

  private constructor(
    public readonly userConfig: HardhatUserConfig,
    public readonly config: HardhatConfig,
    public readonly hooks: HookManager,
    public readonly interruptions: UserInterruptionManager,
    public readonly globalOptions: GlobalOptions,
    globalOptionDefinitions: GlobalOptionDefinitions,
  ) {
    this.tasks = new TaskManagerImplementation(this, globalOptionDefinitions);
  }
}

/**
 * Resolves the project root of a Hardhat project based on the config file or
 * another path within the project. If not provided, it will be resolved from
 * the current working directory.
 *
 * @param absolutePathWithinProject An absolute path within the project, usually
 * the config file.
 */
export async function resolveProjectRoot(
  absolutePathWithinProject: string | undefined,
): Promise<string> {
  return findClosestPackageRoot(absolutePathWithinProject ?? process.cwd());
}

async function runUserConfigExtensions(
  hooks: HookManager,
  config: HardhatUserConfig,
): Promise<HardhatUserConfig> {
  return hooks.runHandlerChain(
    "config",
    "extendUserConfig",
    [config],
    async (c) => {
      return c;
    },
  );
}

async function resolveUserConfig(
  projectRoot: string,
  configPath: string | undefined,
  hooks: HookManager,
  sortedPlugins: HardhatPlugin[],
  config: HardhatUserConfig,
): Promise<HardhatConfig> {
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
  The config resolution is type-unsafe, as plugins augment the HardhatConfig
  type. This means that: (1) we can't fully initialize a valid HardhatConfig
  here, and (2) when writing a hook handler, the value returned by next() is
  probably invalid with respect to your own augmentations. */
  const initialResolvedConfig = {
    plugins: sortedPlugins,
    tasks: config.tasks ?? [],
    paths: await resolvePaths(projectRoot, configPath, config.paths),
  } as HardhatConfig;

  return hooks.runHandlerChain(
    "config",
    "resolveUserConfig",
    [
      config,
      (variable) =>
        new ResolvedConfigurationVariableImplementation(hooks, variable),
    ],
    async (_, __) => {
      return initialResolvedConfig;
    },
  );
}

async function resolvePaths(
  projectRoot: string,
  configPath: string | undefined,
  userProvidedPaths: ProjectPathsUserConfig = {},
): Promise<ProjectPathsConfig> {
  return {
    root: projectRoot,
    config:
      configPath !== undefined
        ? await resolveUserPathFromProjectRoot(projectRoot, configPath)
        : undefined,
    cache: await resolveUserPathFromProjectRoot(
      projectRoot,
      userProvidedPaths.cache ?? "cache",
    ),
    artifacts: await resolveUserPathFromProjectRoot(
      projectRoot,
      userProvidedPaths.artifacts ?? "artifacts",
    ),
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
    We cast as the builtin plugins' type extensions are also applied here,
    making an empty object incompatible, but it's the correct value when you
    ignore the plugins. */
    tests: {} as TestPathsConfig,
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
    See the comment in tests. */
    sources: {} as SourcePathsConfig,
  };
}

/**
 * Resolves a user-provided path into an absolute path.
 *
 * If the path is already absolute, it is returned as is, otherwise it is
 * resolved relative to the project root.
 *
 * @param projectRoot The root of the Hardhat project.
 * @param userPath The user-provided path.
 * @returns An absolute path.
 */
async function resolveUserPathFromProjectRoot(
  projectRoot: string,
  userPath: string,
): Promise<string> {
  if (path.isAbsolute(userPath)) {
    return userPath;
  }

  return path.resolve(projectRoot, userPath);
}
