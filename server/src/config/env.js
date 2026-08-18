import { BlockList, isIP } from 'net';

export const configuredInteger = (name, fallback, minimum, maximum) => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
  return value;
};

export const SOCKET_CONNECTION_LIMIT = configuredInteger('SOCKET_CONNECTION_RATE_LIMIT', 60, 1, 10_000);
export const SOCKET_JOIN_LIMIT = configuredInteger('SOCKET_JOIN_RATE_LIMIT', 30, 1, 1_000);
export const SOCKET_LOCATION_LIMIT = configuredInteger('SOCKET_LOCATION_RATE_LIMIT', 60, 1, 10_000);
export const SOCKET_MUTATION_LIMIT = configuredInteger('SOCKET_MUTATION_RATE_LIMIT', 30, 1, 1_000);
export const SOCKET_PHOTO_LIMIT = configuredInteger('SOCKET_PHOTO_RATE_LIMIT', 6, 1, 100);
export const SOCKET_MAX_PAYLOAD_BYTES = configuredInteger('SOCKET_MAX_PAYLOAD_BYTES', 1_100_000, 64 * 1024, 5 * 1024 * 1024);
export const LOGIN_IP_LIMIT = configuredInteger('LOGIN_IP_RATE_LIMIT', 50, 1, 10_000);
export const LOGIN_FAILURE_LIMIT = configuredInteger('LOGIN_RATE_LIMIT', 10, 1, 1_000);
export const ACCESS_LINK_LIMIT = configuredInteger('ACCESS_LINK_RATE_LIMIT', 30, 1, 1_000);
export const PUBLIC_ACCESS_LIMIT = configuredInteger('PUBLIC_ACCESS_RATE_LIMIT', 120, 1, 10_000);
export const TILE_ACCESS_LIMIT = configuredInteger('TILE_RATE_LIMIT', 300, 1, 10_000);
export const PASSWORD_CHANGE_LIMIT = configuredInteger('PASSWORD_CHANGE_RATE_LIMIT', 10, 1, 100);

export const PORT = Number(process.env.PORT || 3001);

const rawTrustProxy = String(process.env.TRUST_PROXY || '').trim();
let trustedProxyHops = 0;
let trustedProxyAddresses = null;

export const configureTrustProxy = (app) => {
  if (rawTrustProxy && rawTrustProxy.toLowerCase() !== 'false') {
    if (rawTrustProxy.toLowerCase() === 'true') {
      trustedProxyHops = 1;
      app.set('trust proxy', 1);
    } else if (/^\d+$/.test(rawTrustProxy) && Number(rawTrustProxy) <= 10) {
      trustedProxyHops = Number(rawTrustProxy);
      if (trustedProxyHops) app.set('trust proxy', trustedProxyHops);
    } else {
      const proxies = rawTrustProxy.split(',').map(value => value.trim()).filter(Boolean);
      const validProxy = value => {
        const separator = value.lastIndexOf('/');
        if (separator < 0) return Boolean(isIP(value));
        const address = value.slice(0, separator);
        const prefix = value.slice(separator + 1);
        const family = isIP(address);
        return Boolean(family) && /^\d+$/.test(prefix) && Number(prefix) <= (family === 4 ? 32 : 128);
      };
      if (!proxies.length || proxies.some(value => !validProxy(value))) throw new Error('TRUST_PROXY must be false, true, a hop count from 0 to 10, or a comma-separated IP/CIDR list');
      trustedProxyAddresses = new BlockList();
      for (const proxy of proxies) {
        const separator = proxy.lastIndexOf('/');
        const address = separator < 0 ? proxy : proxy.slice(0, separator);
        const family = isIP(address) === 4 ? 'ipv4' : 'ipv6';
        if (separator < 0) trustedProxyAddresses.addAddress(address, family);
        else trustedProxyAddresses.addSubnet(address, Number(proxy.slice(separator + 1)), family);
      }
      app.set('trust proxy', proxies);
    }
  }
};

export const normalizedProxyAddress = value => {
  let address = String(value || '').trim().replace(/^"|"$/g, '');
  const bracketed = address.match(/^\[([^\]]+)](?::\d+)?$/);
  if (bracketed) address = bracketed[1];
  const ipv4WithPort = address.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4WithPort) address = ipv4WithPort[1];
  if (address.toLowerCase().startsWith('::ffff:') && isIP(address.slice(7)) === 4) address = address.slice(7);
  return isIP(address) ? address : '';
};

export const trustedClientAddress = request => {
  const remoteAddress = normalizedProxyAddress(request.socket?.remoteAddress) || 'unknown';
  const forwarded = String(request.headers?.['x-forwarded-for'] || '').split(',')
    .map(normalizedProxyAddress).filter(Boolean).reverse();
  const chain = [remoteAddress, ...forwarded];
  if (trustedProxyAddresses) {
    let position = 0;
    while (position < chain.length - 1) {
      const current = chain[position];
      const family = isIP(current) === 4 ? 'ipv4' : isIP(current) === 6 ? 'ipv6' : null;
      if (!family || !trustedProxyAddresses.check(current, family)) break;
      position += 1;
    }
    return chain[position];
  }
  return chain[Math.min(trustedProxyHops, chain.length - 1)];
};

export const allowedOrigins = String(process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',').map(value => value.trim()).filter(Boolean);
if (allowedOrigins.includes('*')) throw new Error('CORS_ORIGIN must list explicit origins when credentials are enabled');

export const corsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Origin is not allowed'));
  }
};
