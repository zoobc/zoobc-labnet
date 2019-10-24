#!/bin/bash
cd "$(dirname "$0")"
git pull
git submodule update --remote
balena deploy zbcDev --build
