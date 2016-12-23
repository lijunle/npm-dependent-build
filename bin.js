#!/usr/bin/env node

const pino = require('pino');
const chalk = require('chalk');
const dependentBuild = require('./index');

const levels = {
  60: chalk.bgRed('FATAL'),
  50: chalk.red('ERROR'),
  40: chalk.yellow('WARN'),
  30: chalk.green('INFO'),
  20: chalk.blue('DEBUG'),
  10: chalk.grey('TRACE'),
};

const standardKeys = [
  'pid',
  'hostname',
  'name',
  'level',
  'msg',
  'time',
  'v',
];

function withSpaces(value, startIndex) {
  startIndex = startIndex || 0; // eslint-disable-line no-param-reassign
  return value.split('\n')
    .map((line, index) => (index < startIndex ? line : `    ${line}`))
    .join('\n');
}

function filter(value) {
  return Object.keys(value)
    .filter(key => standardKeys.indexOf(key) === -1)
    .filter(key => key.indexOf('_') !== 0)
    .map(key => `    ${key}: ${withSpaces(JSON.stringify(value[key], null, 2), 1)}`)
    .join('\n');
}

function formatter(value) {
  const timeISO = new Date(value.time).toISOString();
  const timeLeft = chalk.magenta('[');
  const timeRight = chalk.magenta(']');
  const time = `${timeLeft}${timeISO}${timeRight}`;

  const level = levels[value.level];
  const message = chalk.cyan(value.msg);
  const details = value.type === 'Error' ? withSpaces(value.stack) : filter(value);
  const detailsBreak = details ? '\n' : '';

  return `${time} ${level} ${message}${detailsBreak}${details}`;
}

const pretty = pino.pretty({ formatter });
pretty.pipe(process.stdout);

const logLevel = process.env.DEPENDENT_BUILD_LOG || 'info';
const logger = pino({ name: 'dependent-build', level: logLevel }, pretty);
const workingFolder = process.argv[2] || '';
dependentBuild(logger, workingFolder)
  .then(() => logger.info('Dependent build successfully'))
  .catch((error) => {
    logger.error(error, 'Dependent build failed');
    process.exitCode = -1; // fail the build
  });
