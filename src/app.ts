import { join } from 'path';
import mongoose from 'mongoose';
import AutoLoad, {AutoloadPluginOptions} from '@fastify/autoload';
import Cors from '@fastify/cors';
import {FastifyPluginAsync} from 'fastify';

export type AppOptions = {
  // Place your custom options for app below here.
} & Partial<AutoloadPluginOptions>;


// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {
}

mongoose.connect(String(process.env.SRB_MONGO_CONNECTION_URL)).catch((err) => {
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
      'http://localhost:3000',
      'http://localhost:3001',
    ],
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
