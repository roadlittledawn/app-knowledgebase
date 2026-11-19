/**
 * clang-auth token verification tests.
 *
 * Hermetic: signs tokens with a throwaway ES256 key and injects its public half
 * with setJwksForTesting, so no auth service or network is needed. Covers what
 * resolveToken decides; cookie/proxy behavior is checked manually (see
 * docs/clang-auth-migration.md, Verification).
 */

import assert from 'node:assert/strict';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose';
import { resolveToken, setJwksForTesting, type AuthSettings } from '../../src/lib/auth/clang-auth';
import { test, finish, log } from './harness';

const settings: AuthSettings = { authBaseUrl: 'https://auth.test', appSlug: 'kb' };

interface SignOptions {
  apps?: Record<string, string[]>;
  issuer?: string;
  expiresIn?: string | number;
  kid?: string;
  key?: CryptoKey;
}

async function main() {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const other = await generateKeyPair('ES256');
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'ES256', use: 'sig' };
  setJwksForTesting(createLocalJWKSet({ keys: [jwk] }));

  function sign(opts: SignOptions = {}): Promise<string> {
    return new SignJWT({
      email: 'me@example.com',
      name: 'Me',
      apps: opts.apps ?? { kb: ['admin'] },
    })
      .setProtectedHeader({ alg: 'ES256', kid: opts.kid ?? 'test-key' })
      .setSubject('user-1')
      .setIssuer(opts.issuer ?? settings.authBaseUrl)
      .setIssuedAt()
      .setJti(crypto.randomUUID())
      .setExpirationTime(opts.expiresIn ?? '15m')
      .sign(opts.key ?? privateKey);
  }

  log('clang-auth session');

  await test('valid admin token → ok with session', async () => {
    const state = await resolveToken(await sign(), settings);
    assert.equal(state.status, 'ok');
    if (state.status !== 'ok') return;
    assert.equal(state.session.sub, 'user-1');
    assert.equal(state.session.email, 'me@example.com');
    assert.deepEqual(state.session.roles, ['admin']);
    assert.ok(state.session.exp > Date.now() / 1000);
  });

  await test('missing token → anonymous', async () => {
    assert.deepEqual(await resolveToken(undefined, settings), { status: 'anonymous' });
  });

  await test('garbage token → anonymous', async () => {
    assert.deepEqual(await resolveToken('not.a.jwt', settings), { status: 'anonymous' });
  });

  await test('expired token (beyond clock tolerance) → anonymous', async () => {
    const token = await sign({ expiresIn: Math.floor(Date.now() / 1000) - 120 });
    assert.deepEqual(await resolveToken(token, settings), { status: 'anonymous' });
  });

  await test('wrong issuer → anonymous', async () => {
    const token = await sign({ issuer: 'https://evil.test' });
    assert.deepEqual(await resolveToken(token, settings), { status: 'anonymous' });
  });

  await test('signed by an unknown key (same kid) → anonymous', async () => {
    const token = await sign({ key: other.privateKey });
    assert.deepEqual(await resolveToken(token, settings), { status: 'anonymous' });
  });

  await test('unknown kid → anonymous', async () => {
    const token = await sign({ kid: 'rotated-away', key: other.privateKey });
    assert.deepEqual(await resolveToken(token, settings), { status: 'anonymous' });
  });

  await test('HS256 token (algorithm switch) → anonymous', async () => {
    const token = await new SignJWT({ email: 'me@example.com', apps: { kb: ['admin'] } })
      .setProtectedHeader({ alg: 'HS256', kid: 'test-key' })
      .setSubject('user-1')
      .setIssuer(settings.authBaseUrl)
      .setExpirationTime('15m')
      .sign(new TextEncoder().encode('a-shared-secret-of-sufficient-length'));
    assert.deepEqual(await resolveToken(token, settings), { status: 'anonymous' });
  });

  await test('no grant for this app → forbidden', async () => {
    const token = await sign({ apps: { lexicon: ['admin'] } });
    assert.deepEqual(await resolveToken(token, settings), {
      status: 'forbidden',
      email: 'me@example.com',
    });
  });

  await test('grant without the admin role → forbidden', async () => {
    const token = await sign({ apps: { kb: ['reader'] } });
    assert.equal((await resolveToken(token, settings)).status, 'forbidden');
  });

  setJwksForTesting(undefined);
  finish('auth-session');
}

main();
