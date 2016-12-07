# dependent-build

[![Build Status](https://travis-ci.org/lijunle/npm-dependent-build.svg?branch=master)](https://travis-ci.org/lijunle/npm-dependent-build)
[![Build status](https://ci.appveyor.com/api/projects/status/xyylkxr3evsbcyvg/branch/master?svg=true)](https://ci.appveyor.com/project/lijunle/npm-dependent-build/branch/master)

[![dependencies Status](https://david-dm.org/lijunle/npm-dependent-build/status.svg)](https://david-dm.org/lijunle/npm-dependent-build)
[![devDependencies Status](https://david-dm.org/lijunle/npm-dependent-build/dev-status.svg)](https://david-dm.org/lijunle/npm-dependent-build?type=dev)

Trigger dependent build by configuration.

*Waning:* This project is in very early stage. The configuration format and APIs may change in the future. I have [a list of features](https://github.com/lijunle/npm-dependent-build/issues/1) in backlog. If you want to help or have any ideas, please open an issue.

## Why

We want small repos but also want to ensure changing one project does not break the dependent projects. Here does dependent-build come to rescue!

## How

1. Install [dependent-build](https://www.npmjs.com/package/dependent-build) from NPM.
1. Add `dependent-build.yml` configuration file at the root folder.
2. Add `dependent-build` command in the CI build scripts.

*Note:* It only supports node version >= 4. If you run matrix with node version < 4, check [node-version-check](https://www.npmjs.com/package/node-version-check).

## License

MIT License.
