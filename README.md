# syncwip
Synchronize work in progress from one machine to another

This is a hack to make it easy for me to synchronize work in progress
from one machine to another, using rsync.

The tool is currently specialized for this use case:

1. Synchronizing code in a local git repository directory to a machine
assumed to have the same repo, in the same relative path within user's home
directory.

2. The source machine has home directories in `/Users/...`, i.e it is a Mac.

The reason for this hack is that I prefer to edit code on a Mac,
but I sometimes develop for Linux/Unbuntu, and I dislike editing code
on Ubuntu.

