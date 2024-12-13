import type { Template } from "./template.js";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

export async function promptForWorkspace(): Promise<string> {
  ensureTTY();

  const { default: enquirer } = await import("enquirer");

  const workspaceResponse = await enquirer.prompt<{ workspace: string }>([
    {
      name: "workspace",
      type: "input",
      message: `Where would you like to initialize the project?\n\nPlease provide either a relative or an absolute path:`,
      initial: ".",
    },
  ]);

  return workspaceResponse.workspace;
}

export async function promptForTemplate(
  templates: Template[],
): Promise<string> {
  ensureTTY();

  const { default: enquirer } = await import("enquirer");

  const templateResponse = await enquirer.prompt<{ template: string }>([
    {
      name: "template",
      type: "select",
      message: "What type of project would you like to initialize?",
      initial: 0,
      choices: templates.map((template) => ({
        name: template.name,
        message: template.packageJson.description,
        value: template.name,
      })),
    },
  ]);

  return templateResponse.template;
}

export async function promptForForce(files: string[]): Promise<boolean> {
  ensureTTY();

  const { default: enquirer } = await import("enquirer");

  const forceResponse = await enquirer.prompt<{ force: boolean }>([
    {
      name: "force",
      type: "confirm",
      message: `The following files already exist in the workspace:\n${files.map((f) => `- ${f}`).join("\n")}\n\nDo you want to overwrite them?`,
      initial: false,
    },
  ]);

  return forceResponse.force;
}

export async function promptForInstall(
  safelyFormattedCommand: string,
): Promise<boolean> {
  ensureTTY();

  const { default: enquirer } = await import("enquirer");

  const installResponse = await enquirer.prompt<{ install: boolean }>([
    {
      name: "install",
      type: "confirm",
      message: `You need to install the project dependencies using the following command:\n${safelyFormattedCommand}\n\nDo you want to run it now?`,
      initial: true,
    },
  ]);

  return installResponse.install;
}

/**
 * ensureTTY checks if the process is running in a TTY (i.e. a terminal).
 * If it is not, it throws and error.
 */
function ensureTTY(): void {
  if (process.stdout.isTTY !== true) {
    throw new HardhatError(
      HardhatError.ERRORS.GENERAL.NOT_IN_INTERACTIVE_SHELL,
    );
  }
}