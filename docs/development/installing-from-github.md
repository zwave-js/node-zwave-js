# Installing from GitHub

If you need to test changes from GitHub, e.g. a branch that fixes an issue you have, here's what you need to do:

1. **This repo uses `npm` workspaces**, so make sure you have updated `npm` to at least `v7`.  
   If not: `npm i -g npm@7`
1. Clone and open this repo, check out the branch:
    ```bash
    git clone https://github.com/zwave-js/node-zwave-js.git
    cd node-zwave-js
    git checkout branch-you-want-to-test
    ```
1. Install dependencies, compile the sources and link the `npm` package
    ```bash
    npm install
    npm run build
    cd packages/zwave-js
    npm link
    ```
1. Open directory of your application, run
    ```bash
    npm link zwave-js
    ```
1. (Re)start your application
