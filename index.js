const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const childProcess = require('child_process');

function createFolder({ logger, folder }) {
  return new Promise((resolve, reject) => {
    logger.debug({ folder }, 'Create folder');
    fs.mkdir(folder, error => (error ? reject(error) : resolve()));
  });
}

function cloneRepo({ logger, workingFolder, repo }) {
  return new Promise((resolve, reject) => {
    logger.info({ workingFolder, repo }, 'Git clone repo start');

    const clone = childProcess.spawn('git', ['clone', repo], { cwd: workingFolder });
    clone.on('error', reject);
    clone.on('exit', (code) => {
      if (code) {
        logger.error({ code }, 'Git clone failed');
        reject(new Error(`Clone ${repo} exit code with ${code}`));
      } else {
        logger.info('Git clone successfully');
        resolve();
      }
    });
  });
}

function cloneRepos({ logger, repoDir, repos }) {
  // TODO multiple repos
  return cloneRepo({
    logger: logger.child({ _cloneRepos: ['cloneRepo', 0] }),
    workingFolder: repoDir,
    repo: repos[0],
  });
}

function runScript({ logger, dependentDir, env, script }) {
  return new Promise((resolve, reject) => {
    logger.info({ script, dependentDir }, 'Start to run script under dependent project directory');
    logger.trace({ env }, 'Run script with environment variables');
    const exec = childProcess.exec(script, { cwd: dependentDir, env });
    exec.stdout.pipe(process.stdout);
    exec.stderr.pipe(process.stderr);
    exec.on('error', reject);
    exec.on('exit', (code) => {
      logger.debug({ code }, 'Script finished with exit code');
      if (code) {
        logger.error('Run script failed');
        reject(new Error(`Execute script exit with ${code}`));
      } else {
        logger.info('Run script successfully');
        resolve();
      }
    });
  });
}

function runScripts({ logger, dependentDir, hostDir, env, scripts }) {
  var lastScript = Promise.resolve(); // eslint-disable-line no-var

  scripts.forEach((script, index) => {
    const childLogger = logger.child({ _runScripts: ['runScript', index] });
    const patchedScript = script.replace(/\$\{HOST_DIR\}/g, JSON.stringify(hostDir));
    lastScript = lastScript.then(() => runScript({
      logger: childLogger,
      dependentDir,
      env,
      script: patchedScript,
    }));
  });

  return lastScript;
}

function runBatch({ logger, repoDir, hostDir, env, batch }) {
  const dependent = batch.repo;
  logger.info({ dependent }, 'Run batch for dependent project');

  const scripts = batch.scripts;
  logger.debug({ scripts }, 'Scripts from batch');

  const dependentName = path.basename(dependent);
  const dependentDir = path.resolve(repoDir, dependentName);
  logger.info({ dependentName, dependentDir }, 'Dependent project name and directory');

  return runScripts({
    logger: logger.child({ _runBatch: 'runScripts' }),
    dependentDir,
    hostDir,
    env,
    scripts,
  });
}

function runBatches({ logger, repoDir, hostDir, env, batches }) {
  return runBatch({
    logger: logger.child({ _runBatches: ['runBatch', 0] }),
    repoDir,
    hostDir,
    env,
    batch: batches[0],
  }); // TODO multiple repos
}

function dependentBuild(logger, hostPath) {
  const currentDir = process.cwd();
  logger.debug({ currentDir }, 'Current working directory');

  const hostDir = path.resolve(currentDir, hostPath);
  logger.info({ hostDir }, 'Host project directory');

  const repoDir = path.resolve(hostDir, 'dependent-build');
  logger.debug({ repoDir }, 'Dependent-build repo directory');

  const configPath = path.resolve(hostDir, 'dependent-build.yml');
  logger.info({ configPath }, 'Dependent-build configuration path');

  const configContent = fs.readFileSync(configPath, 'utf-8');
  logger.trace({ configContent }, 'Dependent-build configuration file content');

  const config = yaml.safeLoad(configContent);
  logger.debug({ config }, 'Dependent-build configuration');

  const repos = Object.keys(config);
  logger.trace({ repos }, 'Got dependent repos');

  const batches = repos.map(repo => ({ repo, scripts: config[repo] }));
  logger.trace({ batches }, 'Arrange config to batches (repo-scripts pairs)');

  const hostBinDir = path.resolve(hostDir, './node_modules/.bin');
  const envPath = `${process.env.PATH}${path.delimiter}${hostBinDir}`;
  const env = Object.assign({ PATH: envPath }, process.env);
  logger.debug({ envPath, hostBinDir }, 'Construct environment path variable');

  return createFolder({
    logger: logger.child({ _dependentBuild: 'createFolder' }),
    folder: repoDir,
  }).then(() => cloneRepos({
    logger: logger.child({ _dependentBuild: 'cloneRepos' }),
    repoDir,
    repos,
  })).then(() => runBatches({
    logger: logger.child({ _dependentBuild: 'runBatches' }),
    repoDir,
    hostDir,
    env,
    batches,
  }));
}

module.exports = dependentBuild;
