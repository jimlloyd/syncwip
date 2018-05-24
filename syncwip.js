#!/usr/bin/env node

const _ = require('lodash');
const chai = require('chai');
const child_process = require('child_process');
const debug = require('debug');
const P = require('bluebird');
const path = require('path');

const dlog = debug('sync');

const { spawn } = child_process;
const { expect } = chai;

const HOME = path.normalize(process.env.HOME);
const USER = process.env.USER;

const [nodepath, scriptpath, dsthost='iron'] = process.argv;

function asString(chunk) {
  if (typeof chunk === 'string')
    return chunk;
  else
    return chunk.toString('utf8');
}

function execCommand(commandLine) {
  expect(commandLine).to.be.a('string');
  const [cmd, ...args] = commandLine.split(/\s+/);
  return new P((resolve, reject) => {
    let chunks = []
    const stdio = ['ignore', 'pipe', 'inherit'];
    child = spawn(cmd, args, {stdio});
    child.on('exit', () => resolve(chunks.join('')));
    child.on('error', reject);
    child.stdout.on('data', chunk => chunks.push(asString(chunk)));
  });
}

function getRepoRoot() {
  var cmd = 'git rev-parse --show-toplevel';
  return execCommand(cmd)
  .then(cout => path.normalize(cout.trim()))
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

  const cmd = `rsync -rtvul --exclude .git --exclude-from=.gitignore ${root}/ ${DST}/`;

  return execCommand(cmd)
})
.then(cout => process.stdout.write(cout));


