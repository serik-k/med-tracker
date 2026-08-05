export function clinicPasswordResetDecision(actor, target) {
  if (!actor || !target) return { allowed: false, status: 403, code: 'PASSWORD_RESET_DENIED' };
  if (String(actor.id) === String(target.id)) {
    return { allowed: false, status: 409, code: 'USE_SELF_PASSWORD_CHANGE' };
  }
  if (target.role === 'clinic_owner') {
    return { allowed: false, status: 403, code: 'OWNER_PROTECTED' };
  }
  return { allowed: true };
}
