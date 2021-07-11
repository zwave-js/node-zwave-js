# Migrating to v8

For version 8.x, we had several breaking changes lined up, so we also took the chance to sneak in a few more by reworking our dev environment.

Please follow this guide if you're migrating from v7. If migrating from v6, please see the v7 migration guide first.

## Migration from Yarn v1 to Yarn v3

We have migrated the repository to the latest version of `yarn`. This changes a few things, mainly regarding installing dependencies and editor support.
The repo is configured to automatically use the correct `typescript` dependency, but if anything goes wrong, please read [this](https://yarnpkg.com/getting-started/editor-sdks#vscode). Also check out the updated documentation on [developing locally / installing from GitHub](https://zwave-js.github.io/node-zwave-js/#/development/installing-from-github).

## Raise minimum supported Node.js version to 12.22

Node.js 10 has been EOL since April 2021 and many Node.js packages have dropped support since then. In order to be able to properly maintain `zwave-js`, we now need to drop support aswell going forward. We chose to raise the bar a bit further (to Node.js `12.22`) in order to make use of some new features.

## Change secondary exports to `package.json` subpath exports

Since Node.js 12 officially supports `package.json` subpath exports, we removed our hand-rolled build step that has been causing some weirdness when developing on Windows for a while.
Importing the secondary exports `zwave-js/Values` etc. should continue to work, but you won't be able to import internal paths like `zwave-js/build/lib` anymore. Make sure you import the official exports only.

## Skip querying user codes during the interview

We have changed the default interview behavior for the `User Code CC` to no longer query all user codes during the initial interview and calls to `refreshValues`. This is intended to help save device battery as some devices may have hundreds of user codes, leading to significant battery drain.

It is recommended to only query the necessary user codes on demand instead after the node enters its `ready` state.

Using the new `interview.queryAllUserCodes` property of `ZWaveOptions`, the interview behavior can be toggled back to query all codes if you wish to do so.

## Restructing of the Driver's `ZWaveOptions` object

We have unified all interview behavior options under a single key (`interview`). This likely does not affect you, unless you were previously using the internal `skipInterview` property.
The new structure simply wraps the prior key inside `interview` and adds additional options as seen below:

```ts
interface ZWaveOptions {
	// ...
	interview: {
		/**
		 * @internal
		 * Set this to true to skip the controller interview. Useful for testing purposes
		 */
		skipInterview?: boolean;

		/**
		 * Whether all user code should be queried during the interview of the UserCode CC.
		 * Note that enabling this can cause a lot of traffic during the interview.
		 */
		queryAllUserCodes?: boolean;
	};
}
```

## Removed `neighbors` property from `ZWaveNode` class and removed `InterviewStage.Neighbors`

The static `neighbors` property was deprecated in `v7.9.0` and is now removed. Use `controller.getNodeNeighbors` instead to retrieve the neighbor lists on demand instead of accessing stale data. Furthermore, the interview stage `Neighbors` was removed too, because the information is no longer stored.
