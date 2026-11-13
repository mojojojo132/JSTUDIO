#!/bin/zsh
set -e
cd -- "${0:A:h}"
if [[ ! -x .runtime/node/bin/node ]]; then
 print 'Run Setup Mac.command first.'; exit 1
fi
.runtime/node/bin/node scripts/doctor.mjs
