# Installing from GitHub

If you need to test changes from GitHub, e.g. a branch that fixes an issue you have, here's what you need to do:

1. **This repo uses `yarn` workspaces**, so make sure you have `yarn` installed.  
   If not: `npm i -g yarn`
1. Clone and open this repo, check out the branch:
    ```bash
    git clone https://github.com/zwave-js/node-zwave-js.git
    cd node-zwave-js
    git checkout branch-you-want-to-test
    ```
1. Install dependencies, compile the sources and link the packages
    ```bash
    yarn
    yarn run build:full
    lerna exec -- yarn link
    ```
1. Open directory of your application, run
    ```bash
    yarn link zwave-js
    ```
    If you use other packages from the `@zwave-js/*` scope, link them the same way.
1. (Re)start your application
1. If you're planning to work on `zwave-js`, run `yarn run watch` to continuously rebuild the changes
