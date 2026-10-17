import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const zones = ["UTC", "Asia/Tokyo", "America/Los_Angeles", "America/Guayaquil"];
const vitest = resolve("node_modules/vitest/vitest.mjs");
const scheduleTests = "tests/app/(instructor)/instructor/page.test.tsx";

for (const TZ of zones) {
  console.log(`\nRunning instructor schedule tests with TZ=${TZ}`);
  const result = spawnSync(process.execPath, [vitest, "run", scheduleTests], {
    env: { ...process.env, TZ },
    stdio: "inherit",
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
