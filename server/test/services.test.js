import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';
import { geocodeAddress } from '../services/geocoding.js';
import { fetchRealRoadRoute } from '../services/routing.js';
import { fetchMapTile, validTileCoordinates } from '../services/mapTiles.js';

const originalFetch = globalThis.fetch;
const photoDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'medtracker-photo-test-'));
process.env.UPLOAD_DIR = photoDirectory;
const { findAccessPhoto, removeAccessPhoto, saveAccessPhoto } = await import('../services/accessPhotos.js');

after(() => {
  globalThis.fetch = originalFetch;
  if (path.dirname(photoDirectory) === os.tmpdir()) fs.rmSync(photoDirectory, { recursive: true, force: true });
});

test('geocoding fails closed instead of returning a fabricated location', { concurrency: false }, async () => {
  globalThis.fetch = async () => { throw new Error('offline'); };
  assert.equal(await geocodeAddress('Абая 1'), null);
});

test('geocoding accepts finite coordinates from the provider', { concurrency: false }, async () => {
  globalThis.fetch = async () => new Response(JSON.stringify([{ lat: '43.2', lon: '76.9', display_name: 'Алматы' }]), { status: 200 });
  assert.deepEqual(await geocodeAddress('Абая 1'), { lat: 43.2, lng: 76.9, displayName: 'Алматы' });
});

test('routing fails closed instead of returning a synthetic ETA', { concurrency: false }, async () => {
  globalThis.fetch = async () => new Response('{}', { status: 503 });
  assert.equal(await fetchRealRoadRoute({ lat: 43.2, lng: 76.9 }, { lat: 43.3, lng: 76.8 }), null);
});

test('routing maps OSRM geometry and metrics', { concurrency: false }, async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ routes: [{ distance: 1250, duration: 301, geometry: { coordinates: [[76.9, 43.2], [76.8, 43.3]] } }] }), { status: 200 });
  assert.deepEqual(await fetchRealRoadRoute({ lat: 43.2, lng: 76.9 }, { lat: 43.3, lng: 76.8 }), {
    path: [{ lat: 43.2, lng: 76.9 }, { lat: 43.3, lng: 76.8 }],
    distanceMeters: 1250,
    durationSeconds: 301,
    distanceKm: 1.3,
    etaMinutes: 6
  });
});

test('production never contacts implicit public location providers', { concurrency: false }, async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousGeocodingUrl = process.env.GEOCODING_BASE_URL;
  const previousRoutingUrl = process.env.OSRM_BASE_URL;
  const previousTileUrl = process.env.TILE_BASE_URL;
  let fetchCalls = 0;
  process.env.NODE_ENV = 'production';
  delete process.env.GEOCODING_BASE_URL;
  delete process.env.OSRM_BASE_URL;
  delete process.env.TILE_BASE_URL;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('fetch must not be called');
  };
  try {
    assert.equal(await geocodeAddress('Patient address 1'), null);
    assert.equal(await fetchRealRoadRoute({ lat: 43.2, lng: 76.9 }, { lat: 43.3, lng: 76.8 }), null);
    await assert.rejects(fetchMapTile(1, 1, 1), error => error?.code === 'TILE_PROVIDER_NOT_CONFIGURED' && error?.status === 503);
    assert.equal(fetchCalls, 0);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousGeocodingUrl === undefined) delete process.env.GEOCODING_BASE_URL;
    else process.env.GEOCODING_BASE_URL = previousGeocodingUrl;
    if (previousRoutingUrl === undefined) delete process.env.OSRM_BASE_URL;
    else process.env.OSRM_BASE_URL = previousRoutingUrl;
    if (previousTileUrl === undefined) delete process.env.TILE_BASE_URL;
    else process.env.TILE_BASE_URL = previousTileUrl;
  }
});

test('map tile proxy validates coordinates, formats and response limits', { concurrency: false }, async () => {
  assert.equal(validTileCoordinates(0, 0, 0), true);
  assert.equal(validTileCoordinates(20, 0, 0), false);
  assert.equal(validTileCoordinates(2, 4, 0), false);
  let requestedUrl = '';
  globalThis.fetch = async (url, options) => {
    requestedUrl = String(url);
    assert.equal(options.headers.Cookie, undefined);
    return new Response(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), {
      status: 200,
      headers: { 'Content-Type': 'image/png' }
    });
  };
  const tile = await fetchMapTile(2, 1, 3, { baseUrl: 'https://tiles.example/{z}/{x}/{y}.{ext}', maxBytes: 64 });
  assert.equal(requestedUrl, 'https://tiles.example/2/1/3.png');
  assert.equal(tile.contentType, 'image/png');
  assert.equal(tile.body.length, 8);

  globalThis.fetch = async () => new Response(Buffer.alloc(65, 0x89), { status: 200, headers: { 'Content-Type': 'image/png' } });
  await assert.rejects(
    fetchMapTile(2, 1, 3, { baseUrl: 'https://tiles.example/{z}/{x}/{y}.png', maxBytes: 64, cache: false }),
    error => error?.code === 'TILE_TOO_LARGE'
  );

  let releaseDownload;
  globalThis.fetch = () => new Promise(resolve => { releaseDownload = resolve; });
  const firstDownload = fetchMapTile(2, 0, 1, {
    baseUrl: 'https://concurrency.example/{z}/{x}/{y}.png', cache: false, maxConcurrency: 1
  });
  await assert.rejects(
    fetchMapTile(2, 0, 2, { baseUrl: 'https://concurrency.example/{z}/{x}/{y}.png', cache: false, maxConcurrency: 1 }),
    error => error?.code === 'TILE_PROXY_BUSY' && error?.status === 503
  );
  releaseDownload(new Response(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), {
    status: 200, headers: { 'Content-Type': 'image/png' }
  }));
  await firstDownload;
});

test('access photos are validated, stored outside order JSON and removable', () => {
  const onePixelPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const saved = saveAccessPhoto(onePixelPng);
  assert.match(saved.url, /^\/api\/access-photos\/[A-Za-z0-9_-]+$/);
  assert.equal(saved.mimeType, 'image/png');
  assert.ok(findAccessPhoto(saved.token));
  removeAccessPhoto(saved.url);
  assert.equal(findAccessPhoto(saved.token), null);
  assert.throws(() => saveAccessPhoto('data:image/png;base64,SGVsbG8='), /формат/);
});
