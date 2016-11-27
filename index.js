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
    .then(() => cloneRepos(logger.child({ _dependentBuild: 'cloneRepos' }), workingFolder, repos));
}

module.exports = dependentBuild;
