# Development introduction {docsify-ignore-all}

## Help, I know nothing about `npm`, `yarn`, `lerna` and whatever...

_Alright, here's a short introduction if you're new to this stuff. If you know the basics, feel free to [skip forward](`#Prerequisites`)._

`npm` and `yarn` are both package managers for `Node.js` projects. `npm` comes with `Node.js` by default, but especially new major releases are often buggy, so we've decided to use `yarn` instead.

> [!WARNING]
> When working with Linux, you might already have a `yarn` executable on your system, but that is [not the correct one](https://stackoverflow.com/a/45551189/10179833). To install the correct one, run `npm i -g yarn`, which installs `yarn` the package manager globally on your system. If you're on Windows, **DO NOT** install `yarn` with an installer, as this version can mess things up.

`yarn` has a [bunch of commands](https://classic.yarnpkg.com/en/docs/usage) but you'll likely only need to use `yarn` (short for `yarn install`) to install all dependencies. **Don't** install missing dependencies one by one, **don't** install them globally.  
`yarn` can also run package scripts for you, which we use extensively, e.g. `yarn run build` to compile TypeScript into JavaScript. You'll find most of the scripts in `package.json` under `"scripts"`.

[`lerna`](https://github.com/lerna/lerna) is a tool to manage monorepos (multiple dependent packages in a single repo) that works hand in hand with `yarn`. Since it allows running package scripts of sub-packages, we use it for some of our workflows.  
To use `lerna`, you need to install it globally with `npm i -g lerna`. If you prefer not to, you can alternatively just prefix the commands with `npx`, e.g. `npx lerna run <scriptname>`.

## Prerequisites

For the best possible development experience, you should use [VSCode](https://code.visualstudio.com/).
The repository comes with settings and recommended extensions to make your life easier when working on `node-zwave-js`. The snippets alone will save you a ton of typing.  
It is **strongly recommended** to install the recommended extensions when VSCode asks you.

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

Afterwards just execute `yarn` in the cloned directory, which will install all required dependencies.

---

For more details on the different development tasks, check the corresponding pages:

## [Implementing Command Classes](development/implementing-cc.md)

Most of the Z-Wave functionality exists in Command Classes (short: CC). Here's a high-level overview how to implement them.
