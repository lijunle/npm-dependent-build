const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function dependentBuild(folderPath) {
  const cwd = process.cwd();
  const configPath = path.resolve(cwd, folderPath, 'dependent-build.yml');
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const config = yaml.safeLoad(configContent);
  console.log(config);
}

module.exports = dependentBuild;
