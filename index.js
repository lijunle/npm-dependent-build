const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const childProcess = require('child_process');

function createFolder(logger, folder) {
  return new Promise((resolve, reject) => {
    logger.debug({ folder }, 'Create folder');
    fs.mkdir(folder, error => (error ? reject(error) : resolve()));
  });
}

function cloneRepo(logger, cwd, repo) {
  return new Promise((resolve, reject) => {
    logger.info({ cwd, repo }, 'Git clone repo start');

    const clone = childProcess.spawn('git', ['clone', repo], { cwd });
    clone.on('error', reject);
    clone.on('exit', (code) => {
      if (code) {
        logger.error({ code }, 'Git clone failed');
        reject(`Clone ${repo} exit code with ${code}`);
      } else {
        logger.info('Git clone successfully');
        resolve();
      }
    });
  });
}

function cloneRepos(logger, workingFolder, repos) {
  return cloneRepo(logger.child({ _cloneRepos: ['cloneRepo', 0] }), workingFolder, repos[0]); // TODO multiple repos
}

function runScript(logger, cwd, script) {
  return new Promise((resolve, reject) => {
    logger.info({ cwd, script }, 'Start to run script under working directory');
    const exec = childProcess.exec(script, { cwd });
    exec.stdout.pipe(process.stdout);
    exec.stderr.pipe(process.stderr);
    exec.on('error', reject);
    exec.on('exit', (code) => {
      if (code) {
        logger.error('Run script failed');
        reject(`Execute script exit with ${code}`);
      } else {
        logger.info('Run script successfully');
        resolve();
      }
    });
  });
}

function runScripts(logger, workingFolder, scripts) {
  let lastScript = Promise.resolve();

  scripts.forEach((script, index) => {
    const childLogger = logger.child({ _runScripts: ['runScript', index] });
    lastScript = lastScript.then(() => runScript(childLogger, workingFolder, script));
  });

  return lastScript;
}

function runBatch(logger, workingFolder, batch) {
  const repo = batch.repo;
  logger.info({ repo }, 'Run batch for repo');

  const scripts = batch.scripts;
  logger.debug({ scripts }, 'Scripts from batch');

  const repoName = path.basename(repo);
  const cwd = path.resolve(workingFolder, repoName);
  logger.info({ cwd }, 'Working directory for batch');

  return runScripts(logger.child({ _runBatch: 'runScripts' }), cwd, scripts);
}

function runBatches(logger, workingFolder, batches) {
  return runBatch(logger.child({ _runBatches: ['runBatch', 0] }), workingFolder, batches[0]); // TODO multiple repos
}

function dependentBuild(logger, folderPath) {
  const cwd = process.cwd();
  logger.info({ cwd }, 'Current working directory');

  const rootFolder = path.resolve(cwd, folderPath);
  logger.debug({ rootFolder }, 'Resolved root directory');

  const workingFolder = path.resolve(rootFolder, 'dependent-build');
  logger.debug({ workingFolder }, 'Dependent-build folder');

  const configPath = path.resolve(rootFolder, 'dependent-build.yml');
  logger.info({ configPath }, 'Dependent-build configuration path');

  const configContent = fs.readFileSync(configPath, 'utf-8');
  logger.trace({ configContent }, 'Dependent-build configuration file content');

  const config = yaml.safeLoad(configContent);
  logger.debug({ config }, 'Dependent-build configuration');

  const repos = Object.keys(config);
  logger.trace({ repos }, 'Got dependent repos');

  const batches = repos.map(repo => ({ repo, scripts: config[repo] }));
  logger.trace({ batches }, 'Arrange config to batches (repo-scripts pairs)');

  return createFolder(logger.child({ _dependentBuild: 'createFolder' }), workingFolder)
    .then(() => cloneRepos(logger.child({ _dependentBuild: 'cloneRepos' }), workingFolder, repos))
    .then(() => runBatches(logger.child({ _dependentBuild: 'runBatches' }), workingFolder, batches));
}

module.exports = dependentBuild;
