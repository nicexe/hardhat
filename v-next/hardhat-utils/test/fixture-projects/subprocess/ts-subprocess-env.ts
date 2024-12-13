import path from "node:path";
import { fileURLToPath } from "node:url";

import { writeJsonFile } from "../../../src/fs.js";

const ABSOLUTE_PATH_TO_TMP_RESULT_SUBPROCESS_FILE: string = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "tmp-file.json",
);

const subprocessInfo = {
  executed: false,
  envVars: {},
};

(() => {
  subprocessInfo.executed = true;
  subprocessInfo.envVars = process.env;

  writeJsonFile(ABSOLUTE_PATH_TO_TMP_RESULT_SUBPROCESS_FILE, subprocessInfo);
})();