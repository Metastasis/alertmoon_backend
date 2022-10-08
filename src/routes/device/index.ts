import { FastifyPluginAsync } from "fastify"

const plugin: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function (request, reply) {
    return 'this is an device'
  })
}

export default plugin;

export const autoPrefix = '/api/v1/device';
