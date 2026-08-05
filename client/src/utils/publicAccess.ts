export type PublicAccessKind = 'patient' | 'driver';

const storageKeys: Record<PublicAccessKind, string> = {
  patient: 'medtracker:patient-access',
  driver: 'medtracker:driver-access'
};

const canonicalPaths: Record<PublicAccessKind, string> = {
  patient: '/track',
  driver: '/driver-access'
};

function normalizeSecret(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return '';
  const secret = raw.trim();
  return secret.length > 0 && secret.length <= 1024 ? secret : '';
}

function fragmentSecret() {
  const fragment = window.location.hash.slice(1);
  if (!fragment) return '';
  try {
    return normalizeSecret(decodeURIComponent(fragment));
  } catch {
    return '';
  }
}

function storedSecret(kind: PublicAccessKind) {
  try {
    return normalizeSecret(window.sessionStorage.getItem(storageKeys[kind]));
  } catch {
    return '';
  }
}

export function consumePublicAccessSecret(kind: PublicAccessKind, legacyParam?: unknown) {
  const fromFragment = fragmentSecret();
  const fromLegacyPath = normalizeSecret(legacyParam);
  const supplied = fromFragment || fromLegacyPath;

  if (supplied) {
    try {
      window.sessionStorage.setItem(storageKeys[kind], supplied);
    } catch {
      // Session storage can be unavailable in hardened/private browser modes.
    }
  }

  if (window.location.hash || fromLegacyPath) {
    window.history.replaceState(window.history.state, '', `${canonicalPaths[kind]}${window.location.search}`);
  }

  return supplied || storedSecret(kind);
}

export function clearPublicAccessSecret(kind: PublicAccessKind) {
  try {
    window.sessionStorage.removeItem(storageKeys[kind]);
  } catch {
    // Nothing else should retain this capability secret.
  }
}
