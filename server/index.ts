import { z } from 'zod';
import { createApp } from './app';
import { DraftFormatter } from './format-draft';

const config = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().default('127.0.0.1'),
  TYPESAFE_API_KEY: z.string().optional(),
  JEV_MODEL: z.string().default('jev-1.13.0'),
}).parse(process.env);

const app = await createApp({
  formatter: new DraftFormatter({ key: config.TYPESAFE_API_KEY, model: config.JEV_MODEL }),
  logger: true,
  serveStatic: true,
});
await app.listen({ port: config.PORT, host: config.HOST });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
}
