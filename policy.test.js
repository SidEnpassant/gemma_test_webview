// node webchat/policy.test.js
const assert = require('assert');
const policy = require('./policy.js');

// The rule the user is shown.
assert.strictEqual(policy.decide({ ramMB: 2048 }).capable, false, '2 GB');
assert.strictEqual(policy.decide({ ramMB: 3072 }).capable, false, '3 GB');
assert.strictEqual(policy.decide({ ramMB: 6144 }).capable, true, '6 GB');

// A nominal 4 GB phone never reports 4096 — the kernel takes GPU and radio
// memory first — so a literal 4096 threshold would reject all of them.
assert.strictEqual(policy.decide({ ramMB: 3712 }).capable, true, 'real 4 GB');
assert.strictEqual(policy.decide({ ramMB: 3584 }).capable, true, 'real 4 GB');
assert.ok(policy.minRamMB < 4096, 'threshold must sit below 4096');

// Unknown is not a yes. Desktop and web send 0.
for (const ram of [0, -1, undefined, null, 'lots', NaN]) {
  assert.strictEqual(policy.decide({ ramMB: ram }).capable, false, `ram=${ram}`);
}
assert.strictEqual(policy.decide(undefined).capable, false, 'no device yet');

// The page prints `reason` verbatim, so each one has to stand alone.
assert.ok(policy.decide({ ramMB: 2048 }).reason.startsWith('Cannot run'));
assert.ok(policy.decide({ ramMB: 2048 }).reason.includes('2.0 GB'));
assert.ok(policy.decide({ ramMB: 0 }).reason.includes('Cannot tell'));
assert.ok(policy.decide({ ramMB: 6144 }).reason.length > 0);

// Auto-download follows eligibility and nothing else: a device that is not
// offered the model must never be told to fetch 289 MB of it.
assert.strictEqual(policy.decide({ ramMB: 6144 }).autoDownload, true);
assert.strictEqual(policy.decide({ ramMB: 2048 }).autoDownload, false);
assert.strictEqual(policy.decide({ ramMB: 0 }).autoDownload, false);
for (const ram of [0, 2048, 3072, 3584, 6144]) {
  const d = policy.decide({ ramMB: ram });
  assert.strictEqual(d.autoDownload, d.capable, `autoDownload tracks capable at ${ram}`);
}

assert.strictEqual(policy.gb(7680), '7.5');

console.log('policy.js: all assertions passed');
