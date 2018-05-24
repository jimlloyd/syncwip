# syncwip
Synchronize work in progress from one development machine to another

This is a hack to make it easy to synchronize work in progress
from one development machine to another, using rsync.

The tool is currently specialized for this use case:

1. Synchronizing code in a local git repository directory to a machine
assumed to have the same repo, in the same relative path within user's home
directory.

2. The source machine has home directories in `/Users/...`, i.e it is a Mac.

In theory, I could just use `git` for this, but this is faster, and it results
in fewer WIP commits that will have to be squashed.

The main reason for this hack is that I prefer to edit code on a Mac,
but I am currently developing for Linux/Unbuntu, and I dislike editing code
on Ubuntu.

## Usage

```
$ syncwip <dsthost>
```

For example:

```
$ syncwip ironman
```

where `ironman` is the DNS name or path of your remote Unix machine.

You can easily use this tool with multiple repos. `syncwip` can be invoked
from any directory in a `git` working tree, as it performs a
`git rev-parse --show-toplevel` command to locate the repository root directory.

It assumes that the local path to the root will look like this:

`/Users/{USER}/{localpath}/{gitroot}/`

The `{localpath}` part can be zero or more directories, but you must have the
same `{localpath}` on both of your development machines.

`syncwip` constructs the `rsync` destination path as:

`${dsthost}:{localpath}/{gitroot}/`

`syncwip` uses the `.gitignore` file to know which files should not be
synchronized, and of course does not synchronize the `.git` directory.
As such, it should generally do the right thing for any `git` based
project.
