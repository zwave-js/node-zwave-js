# Installing from GitHub

If you need to test changes from GitHub, e.g. a branch that fixes an issue you have, here's what you need to do:

1. Clone and open this repo, check out the branch:
    ```bash
    git clone https://github.com/zwave-js/node-zwave-js.git
    cd node-zwave-js
    git checkout branch-you-want-to-test
    ```
2. Install dependencies, compile the sources and link the `npm` packages
    ```bash
    npx lerna bootstrap
    npm run build
    npx lerna exec -- npm link
    ```
3. Open directory of your application, run
    ```bash
    npm link zwave-js
    ```
4. (Re)start your application
