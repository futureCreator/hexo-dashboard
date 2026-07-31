import assert from "node:assert/strict";
import { getPerplexityKey, buildResearchMessages } from "../lib/perplexity.ts";

// Key getter reads env
process.env.PERPLEXITY_API_KEY = "pplx-test";
assert.equal(getPerplexityKey(), "pplx-test");
delete process.env.PERPLEXITY_API_KEY;
assert.equal(getPerplexityKey(), undefined);

const msgs = buildResearchMessages({
  query: "쿠버네티스 운영이 어렵다",
  category: "Cloud",
});
assert.equal(msgs.length, 2);
assert.equal(msgs[0].role, "system");
assert.match(msgs[0].content, /Cloud/);
assert.match(msgs[0].content, /Korean|한국어/);
assert.equal(msgs[1].role, "user");
assert.equal(msgs[1].content, "쿠버네티스 운영이 어렵다");

console.log("check-perplexity: ok");
