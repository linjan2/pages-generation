#!/bin/sh
set -o errexit
set -o nounset
exec minify "${@}"

