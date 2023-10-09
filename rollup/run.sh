set -o errexit
set -o nounset

IMAGE=ghcr.io/linjan2/js/rollup:main

umask 0002
TEMP="$(mktemp -d)"

if [ ${#} -eq 1 ]
then
  # copy first file as index.js
  cp "${1}" "${TEMP}/index.js"
else
  cp --no-clobber "${@}" "${TEMP}/" >&2
fi

chmod --recursive g+rwX "${TEMP}"

podman run --rm --volume "${TEMP}:/app/files:Z,rw" ${IMAGE}

