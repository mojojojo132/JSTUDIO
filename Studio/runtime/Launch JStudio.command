#!/bin/zsh
set -e
cd -- "${0:A:h}"
if [[ ! -f .runtime/setup-complete.json ]]; then
  print 'Run Setup Mac.command first.'; exit 1
fi
export PATH="$PWD/.runtime/node/bin:$PATH"
if [[ ! -x .runtime/node/bin/node ]]; then
  print 'Portable Node is missing. Rerun Setup Mac.command.'; exit 1
fi
.runtime/node/bin/node scripts/launch.mjs "$@"
