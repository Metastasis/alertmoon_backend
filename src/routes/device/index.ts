import {FastifyPluginAsync, FastifyRequest} from 'fastify';
import {V0alpha2Api, Configuration} from '@ory/client';
import {DeviceModel} from './schema';


const ory = new V0alpha2Api(
  new Configuration({
    basePath: process.env.ORY_SDK_URL,
  }),
);


interface PhoneNumber {
  mobileNumber: string;
}


interface SmsLog {
  _id: string,
  content: string
}

interface Pagination {
  page: number
}

type SubscribeRequest = FastifyRequest<{
  Body: PhoneNumber
}>;
type SubscribeSearchRequest = FastifyRequest<{
  Body: PhoneNumber & Pagination
}>;
type SmsLogRequest = FastifyRequest<{
  Body: PhoneNumber & {
    content: string
  }
}>;
type SmsSearchRequest = FastifyRequest<{
  Body: PhoneNumber & {
    page?: number
  }
}>;
const subscribeOptions = {
  schema: {
    body: {
      type: 'object',
      additionalProperties: false,
      required: ['mobileNumber'],
      properties: {
        mobileNumber: {type: 'string'},
        countryCode: {type: 'string'}
      }
    }
  }
};

const subscribeSearchOptions = {
  schema: {
    body: {
      type: 'object',
      properties: {
        mobileNumber: {type: 'string'},
        countryCode: {type: 'string'},
        page: {type: 'string'}
      }
    }
  }
};

const smsLogOptions = {
  schema: {
    body: {
      type: 'object',
      required: ['mobileNumber', 'content'],
      properties: {
        mobileNumber: {type: 'string'},
        countryCode: {type: 'string'},
        content: {type: 'string'}
      }
    }
  }
};

const smsSearchOptions = {
  schema: {
    body: {
      type: 'object',
      required: ['mobileNumber'],
      properties: {
        mobileNumber: {type: 'string'},
        countryCode: {type: 'string'},
        page: {type: 'number'},
      }
    }
  }
};

class DeviceRepository {
  add({mobileNumber}: PhoneNumber) {
    const device = new DeviceModel({
      mobileNumber,
      smsLogs: []
    });
    return device.save();
  }

  find(_params: PhoneNumber & Pagination) {
    return DeviceModel.find().sort({createdAt: 'asc'});
  }

  logSms(params: Pick<SmsLog, 'content'> & PhoneNumber) {
    const {mobileNumber, content} = params;
    const deviceParams = {mobileNumber};
    return DeviceModel.findById(deviceParams).then(device => {
      if (!device) return null;
      device.smsLogs.push({content});
      return device.save();
    });
  }

  findSms(params: {page?: number, perPage?: number} & PhoneNumber) {
    const {mobileNumber, page = 0, perPage = 10} = params;
    const deviceParams = {mobileNumber};
    return DeviceModel.findOne(deviceParams).then(device => {
      if (!device) return null;
      return device.smsLogs.slice(page * perPage, page * perPage + perPage);
    });
  }
}

const plugin: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.decorateRequest('session', null);

  fastify.addHook('preHandler', async (request, reply) => {
    const {data: session} = await ory.toSession(undefined, request.headers.cookie);
    if (!session) return reply.status(401);
    (request as any).session = session;
  });

  fastify.post('/subscribe', subscribeOptions, async function (request: SubscribeRequest, reply) {
    const repo = new DeviceRepository();
    return repo.add(request.body);
  });
  fastify.post('/search', subscribeSearchOptions, async function (request: SubscribeSearchRequest, reply) {
    const repo = new DeviceRepository();
    return repo.find(request.body);
  });
  fastify.post('/sms/log', smsLogOptions, async function (request: SmsLogRequest, reply) {
    const repo = new DeviceRepository();
    return repo.logSms(request.body);
  });
  fastify.post('/sms/search', smsSearchOptions, async function (request: SmsSearchRequest, reply) {
    const repo = new DeviceRepository();
    return repo.findSms(request.body);
  });
};

export default plugin;
export const autoPrefix = '/api/v1/device';
