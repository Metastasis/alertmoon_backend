import { FastifyPluginAsync, FastifyRequest } from "fastify"

interface PhoneNumber {
  mobileNumber: string
  countryCode: string
}
interface DeviceSubscription {
  id: string
  mobileNumber: string
  countryCode: string
}
interface SmsLog {
  id: string,
  subscriptionId: DeviceSubscription['id'],
  content: string
}
type SubscribeRequest = FastifyRequest<{
  Body: PhoneNumber
}>;
type SubscribeSearchRequest = FastifyRequest<{
  Body: PhoneNumber
}>;
type SmsLogRequest = FastifyRequest<{
  Body: {
    subscriptionId: DeviceSubscription['id']
    content: string
  }
}>;
type SmsSearchRequest = FastifyRequest<{
  Body: {
    page?: number
  }
}>;
const subscribeOptions = {
  schema: {
    body: {
      type: 'object',
      required: ['mobileNumber', 'countryCode'],
      properties: {
        mobileNumber: { type: 'string' },
        countryCode: { type: 'string' }
      }
    }
  }
}

const subscribeSearchOptions = {
  schema: {
    body: {
      type: 'object',
      required: ['mobileNumber', 'countryCode'],
      properties: {
        mobileNumber: { type: 'string' },
        countryCode: { type: 'string' }
      }
    }
  }
}

const smsLogOptions = {
  schema: {
    body: {
      type: 'object',
      required: ['subscriptionId', 'content'],
      properties: {
        subscriptionId: { type: 'string' },
        content: { type: 'string' }
      }
    }
  }
}

const smsSearchOptions = {
  schema: {
    body: {
      type: 'object',
      properties: {
        page: { type: 'number' },
      }
    }
  }
}

const deviceDb: Map<string, DeviceSubscription> = new Map();
class DeviceSubscriptionRepository {
  db: Map<string, DeviceSubscription>;

  constructor(db: Map<string, DeviceSubscription>) {
    this.db = db;
  }

  add(phone: PhoneNumber): Promise<DeviceSubscription> {
    return Promise.resolve({id: '', ...phone});
  }

  find(phone: PhoneNumber): Promise<DeviceSubscription['id'] | null> {
    return Promise.resolve('');
  }
}

const smsDb: Set<SmsLog> = new Set();
class SmsLogRepository {
  db: Set<SmsLog>;

  constructor(db: Set<SmsLog>) {
    this.db = db
  }

  add(log: Pick<SmsLog, 'subscriptionId' | 'content'>): Promise<SmsLog> {
    return Promise.resolve({id: '', ...log})
  }

  find(query: {page?: number, perPage?: number}): Promise<SmsLog[] | []> {
    const {} = query || {page: 1, perPage: 20};
    return Promise.resolve([]);
  }
}

const plugin: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function (request, reply) {
    return 'this is an device'
  })
  fastify.post('/subscribe', subscribeOptions, async function (request: SubscribeRequest, reply) {
    const repo = new DeviceSubscriptionRepository(deviceDb)
    return repo.add(request.body)
  })
  fastify.post('/search', subscribeSearchOptions, async function (request: SubscribeSearchRequest, reply) {
    const repo = new DeviceSubscriptionRepository(deviceDb)
    return repo.find(request.body)
  })
  fastify.post('/sms/log', smsLogOptions, async function (request: SmsLogRequest, reply) {
    const repo = new SmsLogRepository(smsDb)
    return repo.add(request.body)
  })
  fastify.post('/sms/search', smsSearchOptions, async function (request: SmsSearchRequest, reply) {
    const repo = new SmsLogRepository(smsDb)
    return repo.find(request.body.page ? request.body : {})
  })
}

export default plugin;
export const autoPrefix = '/api/v1/device';
