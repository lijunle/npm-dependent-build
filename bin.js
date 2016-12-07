#!/usr/bin/env node

const pino = require('pino');
const dependentBuild = require('./index');

const pretty = pino.pretty();
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
