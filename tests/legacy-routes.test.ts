import test from 'node:test';
import assert from 'node:assert/strict';

import nextConfig from '../next.config';

test('legacy compatibility routes redirect to the main calculator', async () => {
  assert.equal(typeof nextConfig.redirects, 'function');

  const redirects = await nextConfig.redirects!();
  const actual = redirects.map((entry) => ({
    source: entry.source,
    destination: entry.destination,
    permanent: entry.permanent,
  }));

  assert.deepEqual(actual, [
    { source: '/compatibility', destination: '/', permanent: false },
    { source: '/match', destination: '/', permanent: false },
    { source: '/relationship', destination: '/', permanent: false },
    { source: '/compare', destination: '/', permanent: false },
  ]);
});
