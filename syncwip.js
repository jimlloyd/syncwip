#!/usr/bin/env node

const _ = require('lodash');
const chai = require('chai');
const child_process = require('child_process');
const debug = require('debug');
const P = require('bluebird');
const path = require('path');

const dlog = debug('sync');

const { exec } = child_process;
const { expect } = chai;

const HOME = path.normalize(process.env.HOME);
const USER = process.env.USER;

const [nodepath, scriptpath, dsthost='iron'] = process.argv;

function execCommand(cmd) {
  expect(cmd).to.be.a('string');
  return new P((resolve, reject) => {
    exec(cmd, function (err, cout, cerr) {
      if (err) {
        dlog(`${cmd}: failed with ${cerr}`);
        reject(err);
      }
      else {
        dlog(`${cmd}: success`);
        resolve({cout, cerr});
      }
    });
  });
}

function getRepoRoot() {
  var cmd = 'git rev-parse --show-toplevel';
  return execCommand(cmd)
  .then(({cout}) => path.normalize(cout.trim()))
}

getRepoRoot()
.then(root => {
  dlog(`"${root}"`);
  dlog(`HOME: ${HOME}`);
  dlog(`USER: ${USER}`);

  expect(HOME).to.equal(`/Users/${USER}`); // we're on a Mac

  const base = `${HOME}/`;
  expect(root.startsWith(base));

  const localDir = root.substr(base.length);


  const DST = `${dsthost}:${localDir}`;

  const cmd = `rsync -rtvu --exclude .git --exclude node_modules ${root}/ ${DST}/`;

  return execCommand(cmd)
})
.then(({cout, cerr}) => {
  dlog({cerr});
  process.stdout.write(cout);
});

