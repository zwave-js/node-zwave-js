# Development introduction {docsify-ignore-all}

## Help, I know nothing about `npm`, `yarn` and whatever...

_Alright, here's a short introduction if you're new to this stuff. If you know the basics, feel free to [skip forward](`#Prerequisites`)._

`npm` and `yarn` are both package managers for `Node.js` projects. `npm` comes with `Node.js` by default, but especially new major releases are often buggy, so we've decided to use `yarn` instead.

> [!WARNING]
> When working with Linux, you might already have a `yarn` executable on your system, but that is [not the correct one](https://stackoverflow.com/a/45551189/10179833). To install the correct one, we rely on [corepack](https://github.com/nodejs/corepack), which automatically installs the correct version of `yarn` for you. If you're on Windows, **DO NOT** install `yarn` with an installer, as this version can mess things up.

`yarn` has a [bunch of commands](https://classic.yarnpkg.com/en/docs/usage) but you'll likely only need to use `yarn` (short for `yarn install`) to install all dependencies. **Don't** install missing dependencies one by one, **don't** install them globally.\
`yarn` can also run package scripts for you, which we use extensively, e.g. `yarn run build` to compile TypeScript into JavaScript. You'll find most of the scripts in `package.json` under `"scripts"`.

## Online editor

It is now possible to develop on Gitpod, directly in your browser and skip the lengthy setup process.

Click [here](https://gitpod.io/#/https://github.com/zwave-js/node-zwave-js) to start with a preconfigured workspace that contains VSCode and all dependencies, so you can focus on coding.

> [!NOTE] We only have a limited amount of hours and parallel workspaces available. Please use them responsibly.

## Prerequisites

For the best possible offline development experience, you should use [VSCode](https://code.visualstudio.com/).
The repository comes with settings and recommended extensions to make your life easier when working on `node-zwave-js`. The snippets alone will save you a ton of typing.\
It is **strongly recommended** to install the recommended extensions when VSCode asks you to.

Since this repo uses `yarn` workspaces, you need to make sure you have `yarn` installed. If not, run `npm i -g yarn`.

The Z-Wave specifications used to be included in this repository. They have now been moved to a submodule, but still remain in the `git` history, making it relatively large.
It is recommended to clone this repo using

```bash
git clone --filter=blob:none https://github.com/zwave-js/node-zwave-js
```

to avoid downloading all these unnecessary files. The specifications can then (optionally) be downloaded using

```bash
git submodule update
```

After the repository has been cloned, install all dependencies and compile the code by executing

```
yarn
yarn build
```

The last step is recommended, since we make heavy use of custom scripts and plugins meant to help with the development process and authoring config files.

---

For more details on the different development tasks, check the corresponding pages:

## [Implementing Command Classes](development/implementing-cc.md)

Most of the Z-Wave functionality exists in Command Classes (short: CC). Here's a high-level overview how to implement them.
