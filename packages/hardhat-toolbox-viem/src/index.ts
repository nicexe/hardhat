import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-viem";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "./internal/chai-setup";

/**
 * If a new official plugin is added, make sure to update:
 *   - The tsconfig.json file
 *   - The hardhat-toolbox GitHub workflow
 *   - The parts of the documentation that install hardhat-toolbox with npm 6 or yarn
 *   - The list of dependencies that the sample projects install
 *   - The README
 */

import { extendConfig } from "hardhat/config";

extendConfig((config, userConfig) => {
  const configAsAny = config as any;

  // hardhat-gas-reporter doesn't use extendConfig, so
  // the values of config.gasReporter and userConfig.gasReporter
  // are the same. The userConfigVersion is frozen though, so we
  // shouldn't use it.
  const gasReporterConfig =
    configAsAny.gasReporter as typeof userConfig.gasReporter;

  configAsAny.gasReporter = gasReporterConfig ?? {};

  if (gasReporterConfig?.enabled === undefined) {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    configAsAny.gasReporter.enabled = process.env.REPORT_GAS ? true : false;
  }

  if (gasReporterConfig?.currency === undefined) {
    configAsAny.gasReporter.currency = "USD";
  }
});