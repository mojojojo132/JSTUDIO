#!/bin/zsh
set -e
cd -- "${0:A:h}"
mkdir -p .runtime
if [[ ! -x .runtime/node/bin/node ]]; then
  case "$(uname -m)" in
    arm64) archive="node-v24.15.0-darwin-arm64.tar.gz"; expected="372331b969779ab5d15b949884fc6eaf88d5afe87bde8ba881d6400b9100ffc4" ;;
    x86_64) archive="node-v24.15.0-darwin-x64.tar.gz"; expected="ffd5ee293467927f3ee731a553eb88fd1f48cf74eebc2d74a6babe4af228673b" ;;
    *) print 'Unsupported Mac architecture'; exit 1 ;;
  esac
  print 'Downloading portable Node.js from nodejs.org…'
  curl --fail --location --retry 3 "https://nodejs.org/dist/v24.15.0/$archive" -o ".runtime/$archive"
  actual=$(shasum -a 256 ".runtime/$archive" | awk '{print $1}')
  [[ "$actual" == "$expected" ]] || { print 'Node checksum mismatch'; exit 1; }
  mkdir -p .runtime/node
  tar -xzf ".runtime/$archive" -C .runtime/node --strip-components=1
fi
export PATH="$PWD/.runtime/node/bin:$PATH"
node scripts/setup.mjs "$@"
print 'Setup complete. Open Launch JStudio.command.'
