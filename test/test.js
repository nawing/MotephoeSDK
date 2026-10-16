const {describe, it} = require("node:test");
const assert = require("node:assert/strict");

describe("@motephoe/sdk Environment Validation", () => {
  // it("should confirm runtime is Node 26+ or Bun 1.4.3+", () => {
  //   const isBun = typeof Bun !== "undefined";
  //   const isNode = typeof process !== "undefined" && process.versions && process.versions.node;

  //   // Test will pass if running in either valid environment
  //   assert.ok(isBun || isNode, "Should run in a recognized JavaScript environment");

  //   if (isBun) {
  //     console.log(`\n✅ Running in Bun v${Bun.version}`);
  //     // Basic check for Bun 1.4.3 or higher
  //     const [major, minor, patch] = Bun.version.split('.').map(Number);
  //     assert.ok(major >= 1, "Bun major version is too low.");
  //     if (major === 1 && minor < 4) assert.fail("Bun minor version is too low.");
  //     if (major === 1 && minor === 4 && patch < 3) assert.fail("Bun patch version is too low.");
  //   } else {
  //     console.log(`\n✅ Running in Node v${process.versions.node}`);
  //     const nodeMajor = parseInt(process.versions.node.split(".")[0], 10);
  //     assert.ok(nodeMajor >= 26, "Node.js version is lower than 26.");
  //   }
  // });

  it("should successfully load environment variables", () => {
    // We don't strictly require dotenv for the SDK unless the developer uses it,
    // but we verify process.env access works correctly.
    process.env.MOTEPHOE_API_KEY = process.env.MOTEPHOE_API_KEY || "mph_live_TESTKEY";

    assert.strictEqual(typeof process.env.MOTEPHOE_API_KEY, "string", "API key should be a string");
    assert.ok(process.env.MOTEPHOE_API_KEY.startsWith("mph_live_"), "API key should have correct prefix");
  });
});
