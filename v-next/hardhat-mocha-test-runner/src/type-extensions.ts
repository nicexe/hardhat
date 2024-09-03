import "@ignored/hardhat-vnext/types/config";

import type { MochaOptions } from "mocha";

declare module "@ignored/hardhat-vnext/types/config" {
  export interface HardhatUserConfig {
    mocha?: MochaOptions;
  }

  export interface HardhatConfig {
    mocha: MochaOptions;
  }
}