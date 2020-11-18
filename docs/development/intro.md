# Development introduction {docsify-ignore-all}

## Prerequisites

For the best possible development experience, you should use [VSCode](https://code.visualstudio.com/).
The repository comes with settings and recommended extensions to make your life easier when working on `node-zwave-js`. The snippets alone will save you a ton of typing.  
It is **strongly recommended** to install the recommended extensions when VSCode asks you.

Since this repo is structured with `npm` workspaces, you'll need to have `npm` v7 installed. If not, update it with `npm i -g npm@7`.

For more details on the different development tasks, check the corresponding pages:

## [Device configuration files](development/config-files.md)

Since older versions of the Z-Wave standard don't allow us to request everything we need from the devices themselves, there is a need for configuration files. If you want to add a new device or edit an existing one, start here!
