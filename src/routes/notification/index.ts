import {FastifyPluginAsync, FastifyRequest} from 'fastify';
import {V0alpha2Api, Configuration, Session} from '@ory/client';
import {ReadApi, Configuration as KetoConfiguration} from '@ory/keto-client';
import {Types} from 'mongoose';
import {NotificationModel} from './schema';


const ory = new V0alpha2Api(
  new Configuration({
    basePath: process.env.ORY_SDK_URL,
  }),
);
const ketoRead = new ReadApi(new KetoConfiguration({
  basePath: process.env.ORY_SDK_KETO_READ_URL,
  // baseOptions: {
  //   headers: {
  //     'Authorization': process.env.ORY_KETO_TOKEN,
  //   },
  // },
}));


interface SmsLog {
  beneficiaryId: string
  patternId: string
  content: string
}

type LogRequest = FastifyRequest<{
  Body: SmsLog
}>;
type LogSearchRequest = FastifyRequest<{
  Body: {
    page?: number
  }
}>;
const LogOptions = {
  schema: {
    body: {
      type: 'object',
      required: ['beneficiaryId', 'patternId', 'content'],
      properties: {
        beneficiaryId: {type: 'string'},
        patternId: {type: 'string'},
        content: {type: 'string'}
      }
    }
  }
};

const logSearchOptions = {
  schema: {
    body: {
      type: 'object',
      required: [],
      properties: {
        page: {type: 'number'},
      }
    }
  }
};

class NotificationController {
  logSms(params: SmsLog) {
    const {beneficiaryId, patternId, content} = params;
    const item = new NotificationModel({
      beneficiaryId, patternId, content
    });
    return item.save();
  }

  findSms(params: {page?: number, perPage?: number, patternIds: Types.ObjectId[]}) {
    const {patternIds, perPage = 20} = params;
    return NotificationModel
      .find({patternId: {$in: patternIds}})
      .sort({createdAt: 'desc'})
      .limit(perPage);
  }
}

const plugin: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.decorateRequest('session', null);

  fastify.addHook('preHandler', async (request, reply) => {
    const mobileToken = (request.body as any)?.sessionToken;
    const {cookie} = request.headers;
    const {data: session} = await ory.toSession(mobileToken, cookie);
    if (!session) return reply.status(401);
    (request as any).session = session;
  });

  fastify.post('/log', LogOptions, async function (request: LogRequest, reply) {
    // check permissions:
    // - beneficiary is the owner of the pattern
    // - pattern matches content
    const repo = new NotificationController();
    try {
      const result = await repo.logSms(request.body);
      return {status: 'ok', payload: mapNotification(result)};
    } catch (e) {
      console.error(e);
      return {status: 'error'};
    }
  });

  fastify.post('/search', logSearchOptions, async function (request: LogSearchRequest, reply) {
    const repo = new NotificationController();
    const session: Session = (request as any).session;
    // const confidantId = session.identity.id; // это id confidant'а
    const relations = await ketoRead.getRelationTuples(
      undefined,
      undefined,
      'NotificationPattern',
      undefined,
      'viewers',
      session.identity.traits.email
    );
    const patternIds = relations.data.relation_tuples.map(t => new Types.ObjectId(t.object));
    console.log({
      ...relations.data,
      patternIds
    });
    return repo.findSms({...request.body, patternIds});
  });
};

function mapNotification(result) {
  return {
    id: result._id,
    beneficiaryId: result.beneficiaryId,
    sender: result.sender,
    content: result.content
  };
}

export default plugin;
export const autoPrefix = '/api/v1/notification';
