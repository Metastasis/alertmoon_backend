import {
  BatchSpanProcessor,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-base';
import {NodeTracerProvider} from '@opentelemetry/sdk-trace-node';
import {OTLPTraceExporter} from '@opentelemetry/exporter-trace-otlp-http';
// import {OTLPTraceExporter} from '@opentelemetry/exporter-trace-otlp-grpc';
import {SemanticResourceAttributes} from '@opentelemetry/semantic-conventions';
import {Resource} from '@opentelemetry/resources';
import {HttpInstrumentation} from '@opentelemetry/instrumentation-http';
import {registerInstrumentations} from '@opentelemetry/instrumentation';
import {diag, DiagConsoleLogger, DiagLogLevel} from '@opentelemetry/api';

type Params = {environment: string};

// https://opentelemetry.io/docs/instrumentation/js/
// https://web.archive.org/web/20210302114215/https://tracing.cloudnative101.dev/docs/lab-jaeger-nodejs.html

export function init({environment}: Params) {
  if (Number(JSON.parse(process.env.ALERTMOON_OPENTELEMETRY_DEBUG || '""')) === 1) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ALL);
  }
  const collectorOptions = {
    // url is optional and can be omitted - default is http://localhost:4318/v1/traces
    // url: `${process.env.JAEGER_AGENT_HOST}`,
    // an optional object containing custom headers to be sent with each request will only work with http
    headers: {},
    // an optional limit on pending requests
    concurrencyLimit: 10,
  };
  const provider = new NodeTracerProvider({
    sampler: new TraceIdRatioBasedSampler(0.5),
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'alertmoon-backend', // Service name that show be listed in jaeger ui
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
    }),
  });
  const exporter = new OTLPTraceExporter(collectorOptions);
  // Add a span exporter.
  provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
    // The maximum queue size. After the size is reached spans are dropped.
    maxQueueSize: 1000,
    // The interval between two consecutive exports
    scheduledDelayMillis: 3000,
  }));
  // Register a global tracer provider.
  provider.register();
  // Register instrumentation
  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation()
    ]
  });
  ['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, () => provider.shutdown().catch(console.error));
  });
}
