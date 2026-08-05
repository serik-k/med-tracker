import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'medtracker-order-test-'));
process.env.LEGACY_DB_DIR = testDirectory;
process.env.UPLOAD_DIR = path.join(testDirectory, 'uploads');
process.env.SEED_DISPATCHER_PASSWORD = 'Dispatch123!';
delete process.env.DATABASE_URL;

const { orderStore } = await import('../store.js');
const { tenantStore } = await import('../db/tenantStore.js');
const { findAccessPhoto } = await import('../services/accessPhotos.js');

after(async () => {
  await orderStore.close();
  await tenantStore.close();
  if (path.dirname(testDirectory) === os.tmpdir()) fs.rmSync(testDirectory, { recursive: true, force: true });
});

test('cancelling an order physically removes its access photo', async () => {
  await orderStore.init();
  const created = await orderStore.createOrder('clinic_medclinic_almaty', {
    patientName: 'Test Patient', patientPhone: '+7 700 000 00 00', address: 'Test address 10',
    lat: 43.24, lng: 76.94, crewId: null, priority: 'STANDARD'
  }, 'user_med_dispatcher');
  const onePixelPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const withPhoto = await orderStore.updateAccessInfo(created.token, { photoUrl: onePixelPng }, created.patientAccessToken);
  const photoToken = withPhoto.accessInfo.photoUrl.split('/').at(-1);
  assert.ok(findAccessPhoto(photoToken));

  const { order } = await orderStore.cancelOrder('clinic_medclinic_almaty', created.token, 'test cleanup', 'user_med_dispatcher');
  assert.equal(order.status, 'CANCELLED');
  assert.equal(order.accessInfo.photoUrl, undefined);
  assert.equal(findAccessPhoto(photoToken), null);
});

test('completing an order physically removes its access photo', async () => {
  await orderStore.init();
  const created = await orderStore.createOrder('clinic_medclinic_almaty', {
    patientName: 'Completed Patient', patientPhone: '+7 700 000 00 01', address: 'Test address 11',
    lat: 43.25, lng: 76.95, crewId: null, priority: 'STANDARD'
  }, 'user_med_dispatcher');
  const onePixelPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const withPhoto = await orderStore.updateAccessInfo(created.token, { photoUrl: onePixelPng }, created.patientAccessToken);
  const photoToken = withPhoto.accessInfo.photoUrl.split('/').at(-1);
  assert.ok(findAccessPhoto(photoToken));

  await orderStore.updateOrderStatus('clinic_medclinic_almaty', created.token, 'EN_ROUTE');
  await orderStore.updateOrderStatus('clinic_medclinic_almaty', created.token, 'ARRIVED');
  const completed = await orderStore.updateOrderStatus('clinic_medclinic_almaty', created.token, 'COMPLETED');
  assert.equal(completed.status, 'COMPLETED');
  assert.equal(completed.accessInfo.photoUrl, undefined);
  assert.equal(findAccessPhoto(photoToken), null);
});

test('order creation is idempotent only for the same payload', async () => {
  await orderStore.init();
  const input = {
    patientName: 'Idempotent Patient', patientPhone: '+7 700 000 00 02', address: 'Test address 12',
    lat: 43.26, lng: 76.96, crewId: null, priority: 'URGENT', idempotencyKey: 'test-order-key-0001'
  };
  const created = await orderStore.createOrder('clinic_medclinic_almaty', input, 'user_med_dispatcher');
  const replayed = await orderStore.createOrder('clinic_medclinic_almaty', input, 'user_med_dispatcher');
  assert.equal(replayed.token, created.token);
  assert.equal(replayed.idempotentReplay, true);
  assert.equal(replayed.patientAccessToken, undefined);

  await assert.rejects(
    orderStore.createOrder('clinic_medclinic_almaty', { ...input, address: 'Different address 99' }, 'user_med_dispatcher'),
    error => error?.code === 'IDEMPOTENCY_CONFLICT' && error?.status === 409
  );
});

test('suspending a clinic permanently revokes sessions and public links in file mode', async () => {
  await orderStore.init();
  const issued = await tenantStore.rotateCrewAccess('clinic_medclinic_almaty', '101');
  const staffSession = await tenantStore.login('dispatcher@medclinic.kz', 'Dispatch123!');
  const created = await orderStore.createOrder('clinic_medclinic_almaty', {
    patientName: 'Suspension Patient', patientPhone: '+7 700 000 00 22', address: 'Test address 22',
    lat: 43.24, lng: 76.94, crewId: null, priority: 'STANDARD'
  }, 'user_med_dispatcher');
  const viewer = await orderStore.rotateViewerAccess('clinic_medclinic_almaty', created.token, 'user_med_dispatcher');
  assert.ok(await tenantStore.findCrewByAccessToken(issued.token));
  assert.ok(await tenantStore.authenticate(staffSession.token));
  assert.ok(await orderStore.getPatientOrder(created.patientAccessToken));
  assert.ok(await orderStore.getPatientOrder(viewer.token));
  await tenantStore.updateClinic('clinic_medclinic_almaty', { status: 'SUSPENDED' });
  try {
    assert.equal(await tenantStore.findCrewByAccessToken(issued.token), null);
  } finally {
    await tenantStore.updateClinic('clinic_medclinic_almaty', { status: 'ACTIVE' });
  }
  assert.equal(await tenantStore.findCrewByAccessToken(issued.token), null);
  assert.equal(await tenantStore.authenticate(staffSession.token), null);
  assert.equal(await orderStore.getPatientOrder(created.patientAccessToken), null);
  assert.equal(await orderStore.getPatientOrder(viewer.token), null);
  await orderStore.cancelOrder('clinic_medclinic_almaty', created.token, 'test cleanup', 'user_med_dispatcher');
});

test('patient data cannot be written after a concurrent terminal transition', async () => {
  await orderStore.init();
  const created = await orderStore.createOrder('clinic_medclinic_almaty', {
    patientName: 'Race Patient', patientPhone: '+7 700 000 00 03', address: 'Test address 13',
    lat: 43.27, lng: 76.97, crewId: null, priority: 'STANDARD'
  }, 'user_med_dispatcher');
  const originalPatch = orderStore.patchPatientData.bind(orderStore);
  orderStore.patchPatientData = async (order, ...args) => {
    await orderStore.cancelOrder('clinic_medclinic_almaty', created.token, 'concurrent close', 'user_med_dispatcher');
    return originalPatch(order, ...args);
  };
  try {
    const onePixelPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    await assert.rejects(
      orderStore.updateAccessInfo(created.token, { photoUrl: onePixelPng }, created.patientAccessToken),
      error => error?.code === 'ORDER_NOT_ACTIVE'
    );
    assert.deepEqual(fs.readdirSync(process.env.UPLOAD_DIR), []);
  } finally {
    orderStore.patchPatientData = originalPatch;
  }
});

test('crew status changes are rejected atomically while metadata edits remain allowed', async () => {
  await orderStore.init();
  const created = await orderStore.createOrder('clinic_medclinic_almaty', {
    patientName: 'Crew Guard Patient', patientPhone: '+7 700 000 00 04', address: 'Test address 14',
    lat: 43.28, lng: 76.98, crewId: '101', priority: 'URGENT'
  }, 'user_med_dispatcher');
  await assert.rejects(
    orderStore.updateCrew('clinic_medclinic_almaty', '101', { status: 'BREAK' }),
    error => error?.code === 'CREW_BUSY' && error?.status === 409
  );
  const metadataUpdated = await orderStore.updateCrew('clinic_medclinic_almaty', '101', { driverName: 'Updated Driver' });
  assert.equal(metadataUpdated.driverName, 'Updated Driver');
  assert.equal(metadataUpdated.status, 'ON_CALL');
  await orderStore.cancelOrder('clinic_medclinic_almaty', created.token, 'test cleanup', 'user_med_dispatcher');
});

test('hospital transport only accepts a clinic-configured hospital', async () => {
  await orderStore.init();
  const created = await orderStore.createOrder('clinic_medclinic_almaty', {
    patientName: 'Hospital Guard Patient', patientPhone: '+7 700 000 00 05', address: 'Test address 15',
    lat: 43.29, lng: 76.99, crewId: null, priority: 'STANDARD'
  }, 'user_med_dispatcher');
  await orderStore.updateOrderStatus('clinic_medclinic_almaty', created.token, 'EN_ROUTE');
  await orderStore.updateOrderStatus('clinic_medclinic_almaty', created.token, 'ARRIVED');
  await assert.rejects(
    orderStore.updateOrderStatus('clinic_medclinic_almaty', created.token, 'HOSPITAL_TRANSPORT', 'Unconfigured Hospital', { lat: 43.3, lng: 77 }),
    error => error?.code === 'HOSPITALS_NOT_CONFIGURED' && error?.status === 409
  );
  await orderStore.cancelOrder('clinic_medclinic_almaty', created.token, 'test cleanup', 'user_med_dispatcher');
});

test('concurrent file-mode assignments cannot allocate one crew twice', async () => {
  await orderStore.init();
  const first = await orderStore.createOrder('clinic_medclinic_almaty', {
    patientName: 'Concurrent Patient A', patientPhone: '+7 700 000 00 06', address: 'Test address 16',
    lat: 43.3, lng: 77.01, crewId: null, priority: 'STANDARD'
  }, 'user_med_dispatcher');
  const second = await orderStore.createOrder('clinic_medclinic_almaty', {
    patientName: 'Concurrent Patient B', patientPhone: '+7 700 000 00 07', address: 'Test address 17',
    lat: 43.31, lng: 77.02, crewId: null, priority: 'STANDARD'
  }, 'user_med_dispatcher');
  const results = await Promise.allSettled([
    orderStore.assignOrder('clinic_medclinic_almaty', first.token, '102', 'user_med_dispatcher'),
    orderStore.assignOrder('clinic_medclinic_almaty', second.token, '102', 'user_med_dispatcher')
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const rejection = results.find(result => result.status === 'rejected');
  assert.equal(rejection.reason?.code, 'CREW_BUSY');
  const assigned = (await Promise.all([
    orderStore.getOrderByRef(first.token, 'clinic_medclinic_almaty'),
    orderStore.getOrderByRef(second.token, 'clinic_medclinic_almaty')
  ])).filter(order => order.crewId === '102');
  assert.equal(assigned.length, 1);
  await orderStore.cancelOrder('clinic_medclinic_almaty', first.token, 'test cleanup', 'user_med_dispatcher');
  await orderStore.cancelOrder('clinic_medclinic_almaty', second.token, 'test cleanup', 'user_med_dispatcher');
});

test('concurrent photo replacements leave only the currently referenced file', async () => {
  await orderStore.init();
  const created = await orderStore.createOrder('clinic_medclinic_almaty', {
    patientName: 'Photo Race Patient', patientPhone: '+7 700 000 00 08', address: 'Test address 18',
    lat: 43.32, lng: 77.03, crewId: null, priority: 'STANDARD'
  }, 'user_med_dispatcher');
  const onePixelPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  await Promise.all([
    orderStore.updateAccessInfo(created.token, { photoUrl: onePixelPng }, created.patientAccessToken),
    orderStore.updateAccessInfo(created.token, { photoUrl: onePixelPng }, created.patientAccessToken),
    orderStore.updateAccessInfo(created.token, { photoUrl: onePixelPng }, created.patientAccessToken)
  ]);
  const current = await orderStore.getOrderByRef(created.token, 'clinic_medclinic_almaty');
  const files = fs.readdirSync(process.env.UPLOAD_DIR);
  assert.equal(files.length, 1);
  assert.ok(files[0].startsWith(current.accessInfo.photoUrl.split('/').at(-1)));
  await orderStore.cancelOrder('clinic_medclinic_almaty', created.token, 'test cleanup', 'user_med_dispatcher');
  assert.deepEqual(fs.readdirSync(process.env.UPLOAD_DIR), []);
});

test('a driver cannot read or mutate a terminal order through a repeated status update', async () => {
  await orderStore.init();
  const created = await orderStore.createOrder('clinic_medclinic_almaty', {
    patientName: 'Terminal Driver Patient', patientPhone: '+7 700 000 00 09', address: 'Test address 19',
    lat: 43.33, lng: 77.04, crewId: '103', priority: 'STANDARD'
  }, 'user_med_dispatcher');
  await orderStore.updateOrderStatus('clinic_medclinic_almaty', created.token, 'EN_ROUTE', null, null, { crewId: '103' });
  await orderStore.updateOrderStatus('clinic_medclinic_almaty', created.token, 'ARRIVED', null, null, { crewId: '103' });
  await orderStore.updateOrderStatus('clinic_medclinic_almaty', created.token, 'COMPLETED', null, null, { crewId: '103' });
  await assert.rejects(
    orderStore.updateOrderStatus('clinic_medclinic_almaty', created.token, 'COMPLETED', null, null, { crewId: '103' }),
    error => error?.code === 'ORDER_CLOSED' && error?.status === 409
  );
});

test('self-service password change verifies current password and revokes sessions', async () => {
  await orderStore.init();
  const login = await tenantStore.login('dispatcher@medclinic.kz', 'Dispatch123!');
  assert.ok(login?.token);
  assert.equal(await tenantStore.changeOwnPassword('user_med_dispatcher', 'wrong password', 'UpdatedPass123!'), false);
  assert.ok(await tenantStore.authenticate(login.token));
  assert.equal(await tenantStore.changeOwnPassword('user_med_dispatcher', 'Dispatch123!', 'UpdatedPass123!'), true);
  assert.equal(await tenantStore.authenticate(login.token), null);
  assert.equal(await tenantStore.login('dispatcher@medclinic.kz', 'Dispatch123!'), null);
  assert.ok(await tenantStore.login('dispatcher@medclinic.kz', 'UpdatedPass123!'));
  assert.equal(await tenantStore.changeOwnPassword('user_med_dispatcher', 'UpdatedPass123!', 'Dispatch123!'), true);
});
