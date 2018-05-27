#!/usr/bin/env node

const _ = require('lodash');
const chai = require('chai');
const chalk = require('chalk');
const child_process = require('child_process');
const debug = require('debug');
const path = require('path');
const util = require('util');

const dlog = debug('sync');

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

function forward({out, err}) {
  if (!_.isEmpty(out)) {
    process.stdout.write(out);
  }
  if (!_.isEmpty(err)) {
    process.stderr.write(chalk.red(err));
  }
}

async function exec(command) {
  dlog(`exec command "${command}"`);
  const execP = util.promisify(child_process.exec);
  const {stdout, stderr} = await execP(command);
  dlog('exec stdout:', stdout);
  dlog('exec stderr:', stderr);
  return {out: stdout, err: stderr};
}

async function getRepoRoot() {
  const command = 'git rev-parse --show-toplevel';
  const {out, err} = await exec(command);
  forward({err});
  expect(out).to.exist;
  expect(out).to.be.a('string');
  const repo_root = path.normalize(out.trim());
  dlog(`repo_root: ${repo_root}`);
  return repo_root;
}

async function getRemoteHost() {
  if (_remote_host) {
    return _remote_host;
  } else {
    const command = 'git config syncwip.remote';
    const {out, err} = await exec(command);
    forward({err});
    return out.trim();
  }
}

function getLocalDir({repo_root}) {
  expect(repo_root).to.exist;
  expect(repo_root).to.be.a('string');
  dlog(`"${repo_root}"`);
  dlog(`HOME: ${HOME}`);
  dlog(`USER: ${USER}`);
  expect(HOME).to.equal(`/Users/${USER}`); // Assume we are on a Mac
  const base = `${HOME}/`;
  expect(repo_root.startsWith(base));
  return repo_root.substr(base.length);
}

async function synchronizeRepo({repo_root, remote_host, local_dir}) {
  expect(repo_root).to.exist;
  expect(remote_host).to.exist;
  expect(local_dir).to.exist;
  expect(repo_root).to.be.a('string');
  expect(remote_host).to.be.a('string');
  expect(local_dir).to.be.a('string');

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

  const {out, err} =  await exec(command);
  forward({out, err});
}

async function getRemoteCommand() {
  const command = 'git config syncwip.postsync';
  try {
    const {out, err} = await exec(command);
    return out.trim();
  } catch(e) {
    return null;
  }
}

async function executeRemoteCommand({remote_host, remoteCmd, local_dir}) {
  if (!_.isEmpty(remoteCmd)) {
    const command = `ssh ${remote_host} "cd ${local_dir}; ${remoteCmd}"`
    const {out, err} = await exec(command);
    forward({out, err});
  }
}

async function main() {
  const repo_root = await getRepoRoot();
  const remote_host = await getRemoteHost();
  const local_dir = getLocalDir({repo_root});
  await synchronizeRepo({repo_root, remote_host, local_dir});
  const remote_cmd = await getRemoteCommand();
  await executeRemoteCommand({remote_host, local_dir, remote_cmd});
}

main();
