import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { corsOptions, configureTrustProxy } from './config/env.js';
import { registerRoutes } from './routes/index.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.middleware.js';

export const createApp = () => {
  const app = express();
  app.disable('x-powered-by');
  configureTrustProxy(app);

  app.use(cors(corsOptions));
  app.use((req, res, next) => {
    const suppliedRequestId = String(req.headers['x-request-id'] || '').trim();
    req.requestId = /^[A-Za-z0-9_.:-]{1,100}$/.test(suppliedRequestId) ? suppliedRequestId : crypto.randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
    res.setHeader('Cache-Control', req.path.startsWith('/api/') ? 'no-store' : 'no-cache');
    next();
  });
  app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '256kb', strict: true }));

  registerRoutes(app);

  const staticDirectory = String(process.env.STATIC_DIR || '').trim();
  if (staticDirectory) {
    const resolvedStaticDirectory = path.resolve(staticDirectory);
    const indexFile = path.join(resolvedStaticDirectory, 'index.html');
    if (!fs.existsSync(indexFile)) throw new Error(`STATIC_DIR does not contain index.html: ${resolvedStaticDirectory}`);
    app.use(express.static(resolvedStaticDirectory, {
      index: false,
      maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0
    }));
    app.get('*', (req, res, next) => req.path.startsWith('/api/') ? next() : res.sendFile(indexFile));
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
