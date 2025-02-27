# Installing from GitHub

If you need to test changes from GitHub, e.g. a branch that fixes an issue you have, here's what you need to do:

1. **This repo uses `yarn v2` workspaces**, so make sure you have `yarn` installed.\
   If not: `npm i -g yarn`
1. Clone and open this repo, check out the branch:
   ```bash
   git clone https://github.com/zwave-js/zwave-js.git
   cd zwave-js
   git checkout branch-you-want-to-test
   ```
1. Install dependencies, compile the sources
   ```bash
   yarn bootstrap
   yarn run build
   ```
1. Link the `zwave-js` packages into your repo:
   1. If your repo is using `yarn v2`, execute this in your repo:
      ```bash
      yarn link /path/to/zwave-js --all
      ```
      If you are getting an error like
      ```txt
      Usage Error: This plugin cannot access the package referenced via typanion which is neither a builtin, nor an exposed entry
      ```
      then you might need to upgrade your local version of `yarn`. Versions `3.0.0-rc.6` or higher are known to work.
      ```bash
      yarn set version 3.0.0-rc.6
      ```
   1. If your repo is using `yarn v1`, add the following to your `package.json`, where `/path/to/zwave-js` needs to be the actual path of the `zwave-js` repo:
      ```json
      "resolutions": {
          "@zwave-js/config": "link:/path/to/zwave-js/packages/config",
          "@zwave-js/core": "link:/path/to/zwave-js/packages/core",
          "@zwave-js/maintenance": "link:/path/to/zwave-js/packages/maintenance",
          "@zwave-js/serial": "link:/path/to/zwave-js/packages/serial",
          "@zwave-js/shared": "link:/path/to/zwave-js/packages/shared",
          "@zwave-js/testing": "link:/path/to/zwave-js/packages/testing",
          "zwave-js": "link:/path/to/zwave-js/packages/zwave-js"
      }
      ```
      And execute `yarn` in your repo to set up the links.
1. (Re)start your application
1. If you're planning to work on `zwave-js`, run `yarn run watch` to continuously rebuild the changes
1. Don't forget to remove the `"resolutions"` field and run `yarn` again when you're done testing.
