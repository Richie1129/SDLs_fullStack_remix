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
  customProps: (req, res) => ({ requestId: req.id }),
});

module.exports = { logger, httpLogger };

