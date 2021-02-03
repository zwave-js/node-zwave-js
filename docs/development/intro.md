# Development introduction {docsify-ignore-all}

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

to avoid downloading all these unnecessary files. The specifications can then be downloaded using

```bash
git submodule update
```

---

For more details on the different development tasks, check the corresponding pages:

## [Device configuration files](development/config-files.md)

Since older versions of the Z-Wave standard don't allow us to request everything we need from the devices themselves, there is a need for configuration files. If you want to add a new device or edit an existing one, start here!
