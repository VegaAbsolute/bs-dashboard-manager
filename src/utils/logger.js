const path = require('path');
const winston = require('winston');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

const fileFormat = printf(({ level, message, label, timestamp }) => {
  return `[${label}] ${timestamp} [${level.toUpperCase()}]: ${message}`;
});
const consoleFormat = printf(({ level, message, label }) => {
  return `[${label}] [${level.toUpperCase()}]: ${message}`;
});

const logger = (mainDir) => winston.createLogger({
    transports: [
        new winston.transports.Console({
            level: 'silly',
            format: combine(
                label({ label: 'BS-Dsbd-Mngr' }),
                //timestamp(),
                consoleFormat
            ),
        }),
        new winston.transports.File({
            level: 'warn',
            filename: path.join(mainDir, '..') + '/logs/manager.log',
            maxsize:'1024000',
            maxFiles:'3',
            format: combine(
                label({ label: 'BS-Dshbd-Mngr' }),
                timestamp(),
                fileFormat
            )
        })
    ]
});

exports.logger = logger;
