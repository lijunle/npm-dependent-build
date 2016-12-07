const fs = require('fs');
const path = require('path');

function patch(packageJson, depName, hostPackageName) {
  if (packageJson[depName] && packageJson[depName][hostPackageName]) {
    packageJson[depName][hostPackageName] = 'file:../../'; // eslint-disable-line no-param-reassign
  }
}

const workingFolder = process.cwd();

const hostPackagePath = path.resolve(workingFolder, '../../package.json');
const hostPackageJson = JSON.parse(fs.readFileSync(hostPackagePath));
const hostPackageName = hostPackageJson.name;

const dependentPackagePath = path.resolve(workingFolder, './package.json');
const dependentPackageJson = JSON.parse(fs.readFileSync(dependentPackagePath));

patch(dependentPackageJson, 'dependencies', hostPackageName);
patch(dependentPackageJson, 'devDependencies', hostPackageName);
patch(dependentPackageJson, 'peerDependencies', hostPackageName);

const patchedPackageContent = JSON.stringify(dependentPackageJson, null, 2);
fs.writeFileSync(dependentPackagePath, `${patchedPackageContent}\n`, 'utf-8');
