#!/bin/zsh
set -e
cd -- "${0:A:h}"
exec "./runtime/Check Mac.command" "$@"
