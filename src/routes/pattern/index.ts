import {FastifyPluginAsync, FastifyRequest} from 'fastify';
import {Types} from 'mongoose';
import {V0alpha2Api, Configuration, Session} from '@ory/client';
import {ReadApi, WriteApi, Configuration as KetoConfiguration} from '@ory/keto-client';
import {PatternModel} from './schema';
import {log, mapAxios, mapNotification} from './utils';

const ory = new V0alpha2Api(
  new Configuration({
    basePath: process.env.ORY_SDK_URL,
  }),
);

const ketoWrite = new WriteApi(new KetoConfiguration({
  basePath: process.env.ORY_SDK_KETO_WRITE_URL,
  // baseOptions: {
  //   headers: {
  //     'Authorization': process.env.ORY_KETO_TOKEN,
  //   },
  // },
}));
const ketoRead = new ReadApi(new KetoConfiguration({
  basePath: process.env.ORY_SDK_KETO_READ_URL,
  // baseOptions: {
  //   headers: {
  //     'Authorization': process.env.ORY_KETO_TOKEN,
  //   },
  // },
}));


interface CreatePatternParams {
  sender: string;
  content?: string;
}

type CreatePatternRequest = FastifyRequest<{
  Body: CreatePatternParams
}>;

const createOptions = {
  schema: {
    body: {
      type: 'object',
      required: ['sender'],
      properties: {
        sender: {type: 'string'},
        content: {type: 'string'},
      }
    }
  }
};

interface EditPatternParams {
  patternId: string;
  sender: string;
  content?: string;
}

type EditPatternRequest = FastifyRequest<{
  Body: EditPatternParams
}>;

const editOptions = {
  schema: {
    body: {
      type: 'object',
      required: ['sender'],
      properties: {
        sender: {type: 'string'},
        content: {type: 'string'},
      }
    }
  }
};


interface RemoveParams {
  patternId: string;
}

type RemoveRequest = FastifyRequest<{
  Body: RemoveParams
}>;

const removeOptions = {
  schema: {
    body: {
      type: 'object',
      required: ['patternId'],
      properties: {
        patternId: {type: 'string'}
      }
    }
  }
};

interface SearchParams {
  pageToken: string;
}

type SearchRequest = FastifyRequest<{
  Body: SearchParams
}>;

const searchOptions = {
  schema: {
    body: {
      type: 'object',
      required: [],
      properties: {
        pageToken: {type: 'string'}
      }
    }
  }
};


interface GrantParams {
  confidantEmail: string;
  patternId: string;
}

type GrantRequest = FastifyRequest<{
  Body: GrantParams
}>;

const grantOptions = {
  schema: {
    body: {
      type: 'object',
      required: ['confidantEmail', 'patternId'],
      properties: {
        confidantEmail: {type: 'string'},
        patternId: {type: 'string'}
      }
    }
  }
};

type ListAccessesRequest = FastifyRequest<{
  Body: {
    patternId: string
  }
}>;

const listAccessesOptions = {
  schema: {
    body: {
      type: 'object',
      required: ['patternId'],
      properties: {
        patternId: {type: 'string'}
      }
    }
  }
};


const plugin: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.decorateRequest('session', null);

  fastify.addHook('preHandler', async (request, reply) => {
    const mobileToken = (request.body as any)?.sessionToken;
    const {cookie} = request.headers;
    const {data: session} = await ory.toSession(mobileToken, cookie);
    if (!session) return reply.status(401);
    (request as any).session = session;
  });

  fastify.post('/create', createOptions, async function (request: CreatePatternRequest, reply) {
    // check if its beneficiary. if not then reject
    // save pattern and make current user owner of pattern
    const session: Session = (request as any).session;
    const pattern = new PatternModel({
      beneficiaryId: session.identity.id,
      sender: request.body.sender,
      content: request.body.content
    });
    const saved = await pattern.save();
    console.log(saved);
    const ketoResult = await ketoWrite.createRelationTuple({
      namespace: 'NotificationPattern',
      subject_id: session.identity.id,
      relation: 'owners',
      object: String(saved._id),
    });
    log(mapAxios(ketoResult));
    return {status: 'ok'};
  });
  fastify.post('/update', editOptions, async function (request: EditPatternRequest, reply) {
    // check if its beneficiary. if not then reject
    // save pattern and make current user owner of pattern
    const session: Session = (request as any).session;
    const found = await PatternModel.findOne({
      _id: request.body.patternId,
      beneficiaryId: session.identity.id
    });
    if (!found) return {status: 'not_found'};
    found.sender = request.body.sender;
    found.content = request.body.content || undefined;
    const saved = await found.save();
    console.log(saved);
    return {status: 'ok'};
  });
  fastify.post('/remove', removeOptions, async function (request: RemoveRequest, reply) {
    // check if its beneficiary and is owner of pattern. If not then reject
    // revoke access from all confidants
    // remove pattern and ownership of pattern in Ory Keto
    const session: Session = (request as any).session;
    const found = await PatternModel.findOne({
      _id: request.body.patternId,
      beneficiaryId: session.identity.id
    });
    console.log(found);
    if (!found) return {status: 'ok'};
    const result = await found.remove();
    console.log(result);
    const deleteResult = await ketoWrite.deleteRelationTuples(
      'NotificationPattern',
      request.body.patternId
    );
    log(mapAxios(deleteResult));
    return {status: 'ok'};
  });
  fastify.post('/search', searchOptions, async function (request: SearchRequest, reply) {
    // check if its beneficiary and is owner of patterns
    // return all patterns that matched query
    const session: Session = (request as any).session;
    const relations = await ketoRead.getRelationTuples(
      undefined,
      undefined,
      'NotificationPattern',
      undefined,
      undefined, // viewers + owners
      session.identity.id
    );
    log(mapAxios(relations));
    const ids = relations.data.relation_tuples.map(t => new Types.ObjectId(t.object));
    if (!ids.length) return {status: 'ok', payload: []};
    const patterns = await PatternModel.find({'_id': {$in: ids}});
    console.log(patterns);
    return {status: 'ok', payload: patterns.map(mapNotification)};
  });
  fastify.post('/grant-access', grantOptions, async function (request: GrantRequest, reply) {
    // check if its beneficiary and is owner of pattern. If not then reject
    // request confidant's email and try to find user
    // call ory to create permission rule with confidant's id
    const session: Session = (request as any).session;
    const allowed = await ketoRead.getCheck('NotificationPattern', request.body.patternId, 'owners', session.identity.id);
    if (!allowed) return {status: 'not_an_owner'};
    const result = await ketoWrite.createRelationTuple({
      namespace: 'NotificationPattern',
      subject_id: request.body.confidantEmail,
      relation: 'viewers',
      object: request.body.patternId,
    });
    log(mapAxios(result));
    return {status: 'ok'};
  });
  fastify.post('/revoke-access', grantOptions, async function (request: GrantRequest, reply) {
    // check if its beneficiary and is owner of pattern. If not then reject
    // request confidant's email and try to find user
    // call ory to create permission rule with confidant's id
    const session: Session = (request as any).session;
    const allowed = await ketoRead.getCheck('NotificationPattern', request.body.patternId, 'owners', session.identity.id);
    if (!allowed) return {status: 'not_an_owner'};
    const result = await ketoWrite.deleteRelationTuples(
      'NotificationPattern',
      request.body.patternId,
      'viewers',
      request.body.confidantEmail
    );
    log(mapAxios(result));
    return {status: 'ok'};
  });
  fastify.post('/list-confidants', listAccessesOptions, async function (request: ListAccessesRequest, reply) {
    // check if its beneficiary and is owner of pattern. If not then reject
    // request all viewers of pattern
    const session: Session = (request as any).session;
    const allowed = await ketoRead.getCheck('NotificationPattern', request.body.patternId, 'owners', session.identity.id);
    if (!allowed) return {status: 'not_an_owner'};
    const relations = await ketoRead.getRelationTuples(
      undefined,
      undefined,
      'NotificationPattern',
      request.body.patternId,
      'viewers',
      undefined
    );
    log(mapAxios(relations));
    if (!Array.isArray(relations.data.relation_tuples)) {
      return {status: 'error'};
    }
    return {
      status: 'ok',
      payload: relations.data.relation_tuples.map(tuple => ({
        patternId: tuple.object,
        confidantEmail: tuple.subject_id
      }))
    };
  });
};

export default plugin;
export const autoPrefix = '/api/v1/pattern';
