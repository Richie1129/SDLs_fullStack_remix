const pino = require('pino');
const pinoHttp = require('pino-http');

const isProd = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isProd ? undefined : {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:standard' }
  },
  redact: ['req.headers.authorization', 'req.headers.accessToken']
});

const httpLogger = pinoHttp({
  logger,
  // Ensure reqId is included in chindings without using customProps
  quietReqLogger: true,
  // Avoid customProps to prevent incompatibilities with logger stringify symbols.
});

module.exports = { logger, httpLogger };
