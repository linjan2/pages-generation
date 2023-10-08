set -o errexit
set -o nounset

IMAGE=ghcr.io/linjan2/js/minify:main

umask 0002
TEMP="$(mktemp -d)"
chmod ug+rwX "${TEMP}"

cp "${@}" "${TEMP}/" >&2

pushd "${TEMP}" >/dev/null

shopt -s nullglob
shopt -s dotglob

podman run --rm --volume="${TEMP}:/app/files:Z,rw" ${IMAGE} ./*

