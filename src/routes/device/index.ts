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
  countryCode: string;
}


interface SmsLog {
  _id: string,
  content: string
}


type SubscribeRequest = FastifyRequest<{
  Body: PhoneNumber
}>;
type SubscribeSearchRequest = FastifyRequest<{
  Body: PhoneNumber
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
      required: ['mobileNumber', 'countryCode'],
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
      required: ['mobileNumber', 'countryCode'],
      properties: {
        mobileNumber: {type: 'string'},
        countryCode: {type: 'string'}
      }
    }
  }
};

const smsLogOptions = {
  schema: {
    body: {
      type: 'object',
      required: ['mobileNumber', 'countryCode', 'content'],
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
      required: ['mobileNumber', 'countryCode'],
      properties: {
        mobileNumber: {type: 'string'},
        countryCode: {type: 'string'},
        page: {type: 'number'},
      }
    }
  }
};

class DeviceRepository {
  add({countryCode, mobileNumber}: PhoneNumber) {
    const device = new DeviceModel({
      _id: `${countryCode}${mobileNumber}`,
      mobileNumber,
      countryCode,
      smsLogs: []
    });
    return device.save();
  }

  find({countryCode, mobileNumber}: PhoneNumber) {
    return DeviceModel.findById(`${countryCode}${mobileNumber}`);
  }

  logSms(params: Pick<SmsLog, 'content'> & PhoneNumber) {
    const {countryCode, mobileNumber, content} = params;
    const deviceParams = {countryCode, mobileNumber};
    return this.find(deviceParams).then(device => {
      if (!device) return null;
      device.smsLogs.push({content});
      return device.save();
    });
  }

  findSms(params: {page?: number, perPage?: number} & PhoneNumber) {
    const {countryCode, mobileNumber, page = 0, perPage = 10} = params;
    const deviceParams = {countryCode, mobileNumber};
    return this.find(deviceParams).then(device => {
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
