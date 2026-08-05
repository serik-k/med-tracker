import assert from 'node:assert/strict';
import test from 'node:test';

import { clinicPasswordResetDecision } from '../authPolicy.js';

test('clinic password reset cannot bypass current-password verification for self', () => {
  const owner = { id: 'owner-1', role: 'clinic_owner' };
  assert.deepEqual(clinicPasswordResetDecision(owner, owner), {
    allowed: false,
    status: 409,
    code: 'USE_SELF_PASSWORD_CHANGE'
  });
});

test('clinic password reset protects owners and permits another ordinary staff account', () => {
  const admin = { id: 'admin-1', role: 'clinic_admin' };
  const owner = { id: 'owner-1', role: 'clinic_owner' };
  const dispatcher = { id: 'dispatcher-1', role: 'dispatcher' };
  assert.equal(clinicPasswordResetDecision(admin, owner).code, 'OWNER_PROTECTED');
  assert.deepEqual(clinicPasswordResetDecision(admin, dispatcher), { allowed: true });
});
