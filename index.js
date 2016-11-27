const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const childProcess = require('child_process');

function createFolder(folder) {
  return new Promise((resolve, reject) =>
    fs.mkdir(folder, error => (error ? reject(error) : resolve())));
}

function cloneRepo(cwd, repo) {
  return new Promise((resolve, reject) => {
    const clone = childProcess.spawn('git', ['clone', repo], { cwd });
    clone.on('error', reject);
    clone.on('exit', code => (code ? reject(`Clone ${repo} exit code with ${code}`) : resolve()));
  });
}

function cloneRepos(workingFolder, repos) {
  return cloneRepo(workingFolder, repos[0]); // TODO multiple repos
}

function dependentBuild(folderPath) {
  const cwd = process.cwd();
  const rootFolder = path.resolve(cwd, folderPath);
  const workingFolder = path.resolve(rootFolder, 'dependent-build');
  const configPath = path.resolve(rootFolder, 'dependent-build.yml');
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const config = yaml.safeLoad(configContent);
  const repos = Object.keys(config);

  return createFolder(workingFolder)
    .then(() => cloneRepos(workingFolder, repos));
}

module.exports = dependentBuild;
