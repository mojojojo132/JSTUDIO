#!/bin/zsh
set -e
cd -- "${0:A:h}"
exec "./runtime/Setup Mac.command" "$@"
