import { httpError } from './httpErrors.js';

const parsedRateBucketLimit = Number(process.env.RATE_LIMIT_MAX_BUCKETS || 2_000);
export const RATE_LIMIT_MAX_BUCKETS = Number.isSafeInteger(parsedRateBucketLimit) && parsedRateBucketLimit >= 100 && parsedRateBucketLimit <= 100_000
  ? parsedRateBucketLimit
  : 2_000;

export const rememberAttemptBucket = (buckets, key, timestamps, windowMs, now = Date.now()) => {
  buckets.delete(key);
  buckets.set(key, timestamps);
  if (buckets.size <= RATE_LIMIT_MAX_BUCKETS) return;
  for (const [candidate, values] of buckets) {
    if (!values.some(timestamp => now - timestamp < windowMs)) buckets.delete(candidate);
  }
  while (buckets.size > RATE_LIMIT_MAX_BUCKETS) {
    const oldest = buckets.keys().next().value;
    if (oldest === undefined) break;
    buckets.delete(oldest);
  }
};

export const createRateLimiter = ({ windowMs, max, prefix, key = req => req.ip }) => {
  const attempts = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const attemptKey = `${prefix}:${key(req) || 'unknown'}`;
    const recent = (attempts.get(attemptKey) || []).filter(timestamp => now - timestamp < windowMs);
    if (recent.length >= max) {
      res.setHeader('Retry-After', String(Math.ceil((windowMs - (now - recent[0])) / 1000)));
      return next(httpError(429, 'RATE_LIMITED', 'Слишком много запросов. Повторите попытку позже'));
    }
    recent.push(now);
    rememberAttemptBucket(attempts, attemptKey, recent, windowMs, now);
    next();
  };
};

const socketCapabilityAttempts = new Map();
export const enforceCapabilityRate = (bucket, capability, max, windowMs) => {
  const now = Date.now();
  const attemptKey = `${bucket}:${capability}`;
  const recent = (socketCapabilityAttempts.get(attemptKey) || []).filter(timestamp => now - timestamp < windowMs);
  if (recent.length >= max) throw httpError(429, 'RATE_LIMITED', 'Слишком много realtime-изменений. Повторите попытку позже');
  recent.push(now);
  rememberAttemptBucket(socketCapabilityAttempts, attemptKey, recent, windowMs, now);
};
