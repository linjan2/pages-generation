set -o errexit
set -o nounset

IMAGE=ghcr.io/linjan2/js/rollup:main

umask 0002
TEMP="$(mktemp -d)"

if [ ${#} -eq 1 ]
then
  # copy first file as input.js
  cp "${1}" "${TEMP}/input.js"
else
  # copy first file as input.js
  cp "${@:1:1}" "${TEMP}/input.js"
  # then copy the rest
  cp --no-clobber "${@:2}" "${TEMP}/"
fi

chmod --recursive g+rwX "${TEMP}"

podman run --rm --volume "${TEMP}:/app/files:Z,rw" ${IMAGE}

