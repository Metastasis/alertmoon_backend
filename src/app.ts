import { join } from 'path';
import {readFileSync} from 'fs';
import mongoose from 'mongoose';
import AutoLoad, {AutoloadPluginOptions} from '@fastify/autoload';
import Cors from '@fastify/cors';
import {FastifyPluginAsync} from 'fastify';


const isProd = process.env.NODE_ENV === 'production';

export type AppOptions = {
  // Place your custom options for app below here.
} & Partial<AutoloadPluginOptions>;


const useHttps = Boolean(JSON.parse(process.env.ALERTMOON_USE_HTTPS || 'false'));
const httpsOptions = useHttps ? {
  allowHTTP1: true,
  key: readFileSync('./https/cert.key', {encoding: 'utf-8'}),
  cert: readFileSync('./https/cert.pem', {encoding: 'utf-8'})
} : undefined;
// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {
  // @ts-ignore
  https: httpsOptions
};

mongoose.connect(String(process.env.ALERTMOON_MONGO_URL)).catch((err) => {
  if (err) {
    console.error(err);
    return;
  }
});

const app: FastifyPluginAsync<AppOptions> = async (
    fastify,
    opts
): Promise<void> => {
  // Place here your custom code!
  fastify.register(Cors, {
    origin: [
      !isProd && 'http://localhost:3000',
      !isProd && 'http://localhost:3001',
      !isProd && 'http://127.0.0.1:3000',
      !isProd && 'http://127.0.0.1:3001',
      /https:\/\/([a-z]+\.)?alertmoon\.tech/i
    ].filter(Boolean),
    credentials: true
  });

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    options: opts
  })

  // This loads all plugins defined in routes
  // define your routes in one of these
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    options: opts
  })
};

export default app;
export { app, options }
