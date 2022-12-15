import { test } from 'tap'

// TODO: почему падает если убрать async?
test('All required environment variables are set', async (t) => {
  function isSet(variable: unknown): boolean {
    return typeof variable === 'string' && Boolean(variable);
  }
  t.equal(isSet(process.env.ORY_SDK_URL), true);
  t.equal(isSet(process.env.ALERTMOON_MONGO_URL), true);
});
