#!/bin/bash
set -o errexit
set -o nounset

umask 0002

WORKDIR="${PWD}"
cd /app/src

if [ -r "${WORKDIR}/package.json" ]
then
  # merge package.json files
  cp "${WORKDIR}/package.json" overrides.json
  jq --slurp ".[0] * .[1]" package.json overrides.json > package2.json
  mv package2.json package.json
  rm overrides.json
  # install any additional dependencies
  npm install >&2
fi

shopt -s dotglob
cp --no-clobber "${WORKDIR}"/* ./

npm run fix -- index.js >&2
npm run build -- --input index.js --file output.min.js >&2

exec cat output.min.js

