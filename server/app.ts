import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import staticFiles from '@fastify/static';
import { DraftFormatter, FormatError } from './format-draft';

export async function createApp(options: {
  formatter: DraftFormatter;
  logger?: boolean;
  serveStatic?: boolean;
}) {
  const app = Fastify({ logger: options.logger ?? false, bodyLimit: 65536 });
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: null,
      },
    },
  });
  await app.register(rateLimit, { max: 30, timeWindow: '1 minute' });

  app.get('/api/health', async () => ({ status: 'ok', formatter: options.formatter.configured ? 'ready' : 'not_connected' }));
  app.post<{ Body: { text?: string } }>('/api/format-draft', async (request, reply) => {
    if (typeof request.body?.text !== 'string') throw new FormatError(400, 'Send text to format.');
    const controller = new AbortController();
    reply.raw.on('close', () => controller.abort());
    const result = await options.formatter.format(request.body.text, controller.signal);
    reply.header('Cache-Control', 'no-store');
    return result;
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof FormatError) {
      return reply.status(error.status).send({ error: { code: 'FORMAT_ERROR', message: error.message } });
    }
    if ((error as { statusCode?: number }).statusCode === 429) {
      return reply.status(429).send({ error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.' } });
    }
    request.log.warn({ error }, 'Formatting request failed');
    return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Could not format this text. Try again.' } });
  });

  const dist = resolve('dist');
  if (options.serveStatic && existsSync(dist)) {
    await app.register(staticFiles, { root: dist });
    app.setNotFoundHandler((request, reply) => request.url.startsWith('/api/')
      ? reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'API route not found.' } })
      : reply.sendFile('index.html'));
  }
  return app;
}
