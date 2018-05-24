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

const [nodepath, scriptpath, _remote_host] = process.argv;

function asString(chunk) {
  if (typeof chunk === 'string')
    return chunk;
  else
    return chunk.toString('utf8');
}

function execCommand({command, stdout='pipe'}) {
  if (_.isString(command)) {
    command = command.split(/\s+/);
  }
  expect(command).to.be.a('array');
  const [cmd, ...args] = command;
  return new P((resolve, reject) => {
    let chunks = []
    const stdio = ['ignore', stdout, 'inherit'];
    dlog(`Spawning command "${cmd}" with args:`, args);
    child = spawn(cmd, args, {stdio});
    child.on('exit', () => resolve(chunks.join('')));
    child.on('error', reject);
    if (stdout === 'pipe') {
    child.stdout.on('data', chunk => chunks.push(asString(chunk)));
    }
  });
}

let repo_root;
let local_dir;
let remote_host;

function getRepoRoot() {
  const command = 'git rev-parse --show-toplevel';
  return execCommand({command})
  .then(cout => path.normalize(cout.trim()))
  .tap(root => repo_root = root);
}

function getRemoteHost() {
  if (_remote_host) {
    remote_host = _remote_host;
    return P.resolve(remote_host);
  } else {
    const command = 'git config syncwip.remote';
    return execCommand({command})
    .then(_remote_host => remote_host = _remote_host.trim());
  }
}

function synchronizeRepo() {
  dlog(`"${repo_root}"`);
  dlog(`HOME: ${HOME}`);
  dlog(`USER: ${USER}`);

  expect(HOME).to.equal(`/Users/${USER}`); // Assume we are on a Mac

  const base = `${HOME}/`;
  expect(repo_root.startsWith(base));

  local_dir = repo_root.substr(base.length);

  // We use rsync flags that will force the remote to mirror the local.
  // -r         recursive
  // -t         preserve times
  // -l         copy symlinks as symlinks
  // -v         verbose
  // --delete   delete extraneous files from dest dirs
  const flags = '-rtlv --delete';

  // Excludes -- Use .git to determine what should be ignored/excluded
  // But note that we don't exlude the .git directory itself!
  // This means that commits, branch changes, etc. we make on the local host
  // will automatically happen on the remote host.
  const excludes = '--exclude-from=.gitignore';

  const command = `rsync ${flags} ${excludes} ${repo_root}/ ${remote_host}:${local_dir}/`;

  return execCommand({command, stdout: 'inherit'});
}

function getRemoteCommand() {
  const command = 'git config syncwip.postsync';
  return execCommand({command})
  .then(postsync => postsync.trim());
}

function executeRemoteCommand(remoteCmd) {
  if (_.isEmpty(remoteCmd)) {
    dlog('No postsync comand set');
    return P.resolve();
  } else {
    const command = ['ssh', remote_host, `cd ${local_dir}; ${remoteCmd}`];
    dlog('Executing postsync comand:', command);
    return execCommand({command, stdout: 'inherit'});
  }
}

P.resolve()
.then(() => getRepoRoot())
.then(() => getRemoteHost())
.then(() => synchronizeRepo())
.then(() => getRemoteCommand())
.then(remoteCmd => executeRemoteCommand(remoteCmd));
