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

function execCommand(command) {
  if (_.isString(command)) {
    command = command.split(/\s+/);
  }
  expect(command).to.be.a('array');
  const [cmd, ...args] = command;
  return new P((resolve, reject) => {
    let chunks = []
    const stdio = ['ignore', 'pipe', 'inherit'];
    dlog(`Spawning command "${cmd}" with args:`, args);
    child = spawn(cmd, args, {stdio});
    child.on('exit', () => resolve(chunks.join('')));
    child.on('error', reject);
    child.stdout.on('data', chunk => chunks.push(asString(chunk)));
  });
}

let repo_root;
let local_dir;

function getRepoRoot() {
  const cmd = 'git rev-parse --show-toplevel';
  return execCommand(cmd)
  .then(cout => path.normalize(cout.trim()))
  .tap(root => repo_root = root);
}

function synchronizeRepo() {
  dlog(`"${repo_root}"`);
  dlog(`HOME: ${HOME}`);
  dlog(`USER: ${USER}`);

  expect(HOME).to.equal(`/Users/${USER}`); // Assume we are on a Mac

  const base = `${HOME}/`;
  expect(repo_root.startsWith(base));

  local_dir = repo_root.substr(base.length);

  const DST = `${dsthost}:${local_dir}`;

  const cmd = `rsync -rtvul --exclude .git --exclude-from=.gitignore ${repo_root}/ ${DST}/`;

  return execCommand(cmd)
}

function getRemoteCommand() {
  const cmd = 'git config syncwip.postsync';
  return execCommand(cmd)
  .then(postsync => postsync.trim());
}

function executeRemoteCommand(remoteCmd) {
  if (_.isEmpty(remoteCmd)) {
    dlog('No postsync comand set');
    return P.resolve();
  } else {
    const cmd = ['ssh', dsthost, `cd ${local_dir}; ${remoteCmd}`];
    dlog('Executing postsync comand:', cmd);
    return execCommand(cmd);
  }
}

P.resolve()
.then(() => getRepoRoot())
.then(() => synchronizeRepo())
.then(cout => process.stdout.write(cout))
.then(() => getRemoteCommand())
.then(remoteCmd => executeRemoteCommand(remoteCmd))
.then(cout => process.stdout.write(cout));
