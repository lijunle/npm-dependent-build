const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const childProcess = require('child_process');

function sequencePromise(array, toPromise) {
  var last = Promise.resolve(); // eslint-disable-line no-var

  array.forEach((item, index) => {
    last = last.then(() => toPromise(item, index));
  });

  return last;
}

function createFolder(argv) {
  const logger = argv.logger;
  const folder = argv.folder;

  return new Promise((resolve, reject) => {
    logger.debug({ folder }, 'Create folder');
    fs.mkdir(folder, error => (error ? reject(error) : resolve()));
  });
}

function cloneRepo(argv) {
  const logger = argv.logger;
  const workingFolder = argv.workingFolder;
  const repo = argv.repo;

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

function cloneRepos(argv) {
  const logger = argv.logger;
  const repoDir = argv.repoDir;
  const repos = argv.repos;

  // TODO multiple repos
  return cloneRepo({
    logger: logger.child({ _cloneRepos: ['cloneRepo', 0] }),
    workingFolder: repoDir,
    repo: repos[0],
  });
}

function runScript(argv) {
  const logger = argv.logger;
  const dependentDir = argv.dependentDir;
  const env = argv.env;
  const script = argv.script;

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

function runScripts(argv) {
  const logger = argv.logger;
  const dependentDir = argv.dependentDir;
  const hostDir = argv.hostDir;
  const scripts = argv.scripts;

  const hostBinDir = path.resolve(hostDir, './node_modules/.bin');
  const dependentBinDir = path.resolve(dependentDir, './node_modules/.bin');
  logger.debug({ hostBinDir, dependentBinDir }, 'Construct additional environment paths');

  const envPath = `${process.env.PATH}${path.delimiter}${hostBinDir}${path.delimiter}${dependentBinDir}`;
  const env = Object.assign({ PATH: envPath }, process.env);
  logger.trace({ envPath }, 'The environment path variable passed to run script');

  return sequencePromise(scripts, (script, index) => {
    const childLogger = logger.child({ _runScripts: ['runScript', index] });
    const patchedScript = script.replace(/\$\{HOST_DIR\}/g, JSON.stringify(hostDir));
    return runScript({
      logger: childLogger,
      dependentDir,
      env,
      script: patchedScript,
    });
  });
}

function runBatch(argv) {
  const logger = argv.logger;
  const repoDir = argv.repoDir;
  const hostDir = argv.hostDir;
  const batch = argv.batch;

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
    scripts,
  });
}

function runBatches(argv) {
  const logger = argv.logger;
  const repoDir = argv.repoDir;
  const hostDir = argv.hostDir;
  const batches = argv.batches;

  // TODO multiple repos
  return runBatch({
    logger: logger.child({ _runBatches: ['runBatch', 0] }),
    repoDir,
    hostDir,
    batch: batches[0],
  });
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
    batches,
  }));
}

module.exports = dependentBuild;
