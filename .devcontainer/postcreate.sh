#!/usr/bin/env sh
. ${NVM_DIR}/nvm.sh
nvm install v18.18 --default
yarn
yarn build
