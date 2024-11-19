import type { AssertWithSsfi, Ssfi } from "../utils.js";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@ignored/hardhat-vnext-errors";
import { ensureError } from "@ignored/hardhat-vnext-utils/error";
import { keccak256 } from "ethers/crypto";
import { getBytes, hexlify, isHexString, toUtf8Bytes } from "ethers/utils";

import { PREVIOUS_MATCHER_NAME } from "./constants.js";
import { ordinal } from "./ordinal.js";

export function assertIsNotNull<T>(
  value: T,
  valueName: string,
): asserts value is Exclude<T, null> {
  assertHardhatInvariant(value !== null, `${valueName} should not be null`);
}

export function preventAsyncMatcherChaining(
  context: object,
  matcherName: string,
  chaiUtils: Chai.ChaiUtils,
  allowSelfChaining: boolean = false,
): void {
  const previousMatcherName: string | undefined = chaiUtils.flag(
    context,
    PREVIOUS_MATCHER_NAME,
  );

  if (previousMatcherName === undefined) {
    chaiUtils.flag(context, PREVIOUS_MATCHER_NAME, matcherName);

    return;
  }

  if (previousMatcherName === matcherName && allowSelfChaining) {
    return;
  }

  throw new HardhatError(
    HardhatError.ERRORS.CHAI_MATCHERS.MATCHER_CANNOT_BE_CHAINED_AFTER,
    {
      matcher: matcherName,
      previousMatcher: previousMatcherName,
    },
  );
}

export function assertArgsArraysEqual(
  Assertion: Chai.AssertionStatic,
  expectedArgs: any[],
  actualArgs: any[],
  tag: string,
  assertionType: "event" | "error",
  assert: AssertWithSsfi,
  ssfi: Ssfi,
): void {
  try {
    innerAssertArgsArraysEqual(
      Assertion,
      expectedArgs,
      actualArgs,
      assertionType,
      assert,
      ssfi,
    );
  } catch (err) {
    ensureError(err);
    err.message = `Error in ${tag}: ${err.message}`;
    throw err;
  }
}

function innerAssertArgsArraysEqual(
  Assertion: Chai.AssertionStatic,
  expectedArgs: any[],
  actualArgs: any[],
  assertionType: "event" | "error",
  assert: AssertWithSsfi,
  ssfi: Ssfi,
) {
  assert(
    actualArgs.length === expectedArgs.length,
    `Expected arguments array to have length ${expectedArgs.length}, but it has ${actualArgs.length}`,
  );
  for (const [index, expectedArg] of expectedArgs.entries()) {
    try {
      innerAssertArgEqual(
        Assertion,
        expectedArg,
        actualArgs[index],
        assertionType,
        assert,
        ssfi,
      );
    } catch (err) {
      ensureError(err);
      err.message = `Error in the ${ordinal(index + 1)} argument assertion: ${
        err.message
      }`;
      throw err;
    }
  }
}

function innerAssertArgEqual(
  Assertion: Chai.AssertionStatic,
  expectedArg: any,
  actualArg: any,
  assertionType: "event" | "error",
  assert: AssertWithSsfi,
  ssfi: Ssfi,
) {
  if (typeof expectedArg === "function") {
    try {
      if (expectedArg(actualArg) === true) return;
    } catch (e) {
      ensureError(e);

      assert(
        false,
        `The predicate threw when called: ${e.message}`,
        // no need for a negated message, since we disallow mixing .not. with
        // .withArgs
      );
    }
    assert(
      false,
      `The predicate did not return true`,
      // no need for a negated message, since we disallow mixing .not. with
      // .withArgs
    );
  } else if (expectedArg instanceof Uint8Array) {
    new Assertion(actualArg, undefined, ssfi, true).equal(hexlify(expectedArg));
  } else if (
    expectedArg?.length !== undefined &&
    typeof expectedArg !== "string"
  ) {
    innerAssertArgsArraysEqual(
      Assertion,
      expectedArg,
      actualArg,
      assertionType,
      assert,
      ssfi,
    );
  } else {
    if (actualArg.hash !== undefined && actualArg._isIndexed === true) {
      if (assertionType !== "event") {
        throw new HardhatError(
          HardhatError.ERRORS.CHAI_MATCHERS.INDEXED_EVENT_FORBIDDEN,
        );
      }

      new Assertion(actualArg.hash, undefined, ssfi, true).to.not.equal(
        expectedArg,
        "The actual value was an indexed and hashed value of the event argument. The expected value provided to the assertion should be the actual event argument (the pre-image of the hash). You provided the hash itself. Please supply the actual event argument (the pre-image of the hash) instead.",
      );

      const expectedArgBytes = isHexString(expectedArg)
        ? getBytes(expectedArg)
        : toUtf8Bytes(expectedArg);

      const expectedHash = keccak256(expectedArgBytes);

      new Assertion(actualArg.hash, undefined, ssfi, true).to.equal(
        expectedHash,
        `The actual value was an indexed and hashed value of the event argument. The expected value provided to the assertion was hashed to produce ${expectedHash}. The actual hash and the expected hash ${actualArg.hash} did not match`,
      );
    } else {
      new Assertion(actualArg, undefined, ssfi, true).equal(expectedArg);
    }
  }
}

export function assertCanBeConvertedToBigint(
  value: unknown,
): asserts value is string | number | bigint {
  assertHardhatInvariant(
    typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "bigint",
    "value should be of type string, number or bigint",
  );
}

export function isBigNumber(source: any): boolean {
  return typeof source === "bigint";
}

export function normalizeToBigInt(source: number | bigint | string): bigint {
  switch (typeof source) {
    case "number":
      if (!Number.isInteger(source)) {
        throw new HardhatError(HardhatError.ERRORS.GENERAL.INVALID_BIG_NUMBER, {
          message: `${source} is not an integer`,
        });
      }
      if (!Number.isSafeInteger(source)) {
        throw new HardhatError(HardhatError.ERRORS.GENERAL.INVALID_BIG_NUMBER, {
          message: `Integer ${source} is unsafe. Consider using ${source}n instead. For more details, see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger`,
        });
      }
    // `break;` intentionally omitted. fallthrough desired.
    case "string":
    case "bigint":
      return BigInt(source);
    default:
      throw new HardhatError(HardhatError.ERRORS.GENERAL.INVALID_BIG_NUMBER, {
        message: `Unsupported type ${typeof source}`,
      });
  }
}
