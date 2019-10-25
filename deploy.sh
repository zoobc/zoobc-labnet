#!/bin/bash
cd "$(dirname "$0")"

BALENA_VERSION="$(balena version)"
if [ -z "${BALENA_VERSION}" ]; then
    echo "Please install balena-cli using Executable-Installer or Standalone-Zip from here:"
    echo "https://github.com/balena-io/balena-cli/blob/master/INSTALL.md"
    exit 1
else
    echo "balena-cli v${BALENA_VERSION}"
fi

echo "[localhost] git pull..."
git pull
git submodule update --remote --init

APP_NAME="${1:-zbcDev}"
DOCKER_HOSTNAME="${2:-192.168.20.5}"
DOCKER_PORT="${3:-2376}"
export NODE_EXTRA_CA_CERTS="$(pwd)/balena-ca.crt"
export BALENARC_BALENA_URL="raspi.zoobc.org"
echo "[${DOCKER_HOSTNAME}:${DOCKER_PORT}] balena deploy ${APP_NAME} --build"
balena deploy "${APP_NAME}" -h "${DOCKER_HOSTNAME}" -p "${DOCKER_PORT}" --ca "./.docker/ca.pem" --cert "./.docker/cert.pem" --key "./.docker/key.pem" --build
