# Migrating to v8

For version 8.x, we had several breaking changes lined up, so we also took the chance to sneak in a few more by reworking our dev environment.

Please follow this guide if you're migrating from v7. If migrating from v6, please see the v7 migration guide first.

## Reworked handling of endpoints and lifeline associations

### A little background

So called unsolicited updates (that weren't requested by `zwave-js`) are sent by devices via associations - usually the "Lifeline". The Z-Wave specifications do a terrible job at explaining how these should be configured and used, so as a result, most manufacturers got it wrong. Missing updates are usually caused by incorrect associations or devices that send incorrect or ambiguous reports or simply devices that are unnecessarily using endpoints.

There are (what feels like) 20 different ways to configure these associations to the controller, all of them very dependent on the actual device that should be configured. But only a handful of variations can be automatically decided on, so it is more likely that we get it wrong than right.

When a device sent us a report via the root device, we used to guess which endpoint that report was supposed to come from. No matter how we changed the guessing strategy, some use cases were broken.

### Ignore unnecessary endpoints instead of the root device

Our plan going forward is to detect when endpoints are unnecessary and should be ignored - as opposed to ignoring the root device when there are any endpoints like we do now. This should massively reduce our chances to get the associations wrong, remove the need to make these guesses and make the remaining edge cases easier to handle.

If all endpoints have different device classes, they are most likely unnecessary and will be ignored, because all the functionality will also be exposed on the root device. Those devices that only report via the root device should now work out of the box.

For the other devices that actually need their endpoints despite them being different, a new compat flag was added to restore the current behavior:

```jsonc
"preserveEndpoints": "*", // to preserve all endpoints and hide the root values instead
"preserveEndpoints": [2, 3], // to preserve endpoints 2 and 3, but ignore endpoint 1.
```

For example, there are some thermostats which expose an external sensor with battery through a seemingly unnecessary endpoint, but it needs to be preserved

If some endpoints share a device class, like multi-channel switches, the current behavior of hiding the root device's in favor of the endpoints' values will stay in place.

### Define which endpoint to map root reports to

Because the specs stated that the root device should mirror at least endpoint 1 (and possibly others), we used to map reports that came through the root device to the first supporting endpoint. This behavior has changed a couple of times and has never been perfect for everyone. With this PR, device configs need to opt-in instead to turn on the mapping and specify the target endpoint. Otherwise, reports to the root device get silently ignored if the root's values are hidden.

To do so, a new compat flag was added:

```jsonc
"mapRootReportsToEndpoint": 1
```

This also needs to be used for some devices, e.g. dual channel switches, that partially report un-encapsulated through the root device.

### Prefer node associations on each endpoint over multi channel associations

Many manufacturers seem to get multi channel associations "wrong". We now prefer setting up node associations on each endpoint instead if possible. The default strategy for each endpoint is the following:

1. Try a node association on the current endpoint/root
2. If Association CC is not supported, try assigning a node association with the Multi Channel Association CC
3. If that did not work, fall back to a multi channel association (target endpoint 0)
4. If that did not work either, the endpoint index is `> 0` and the node supports Z-Wave+:  
   Fall back to a multi channel association (target endpoint 0) on the root, if it doesn't have one yet.

Incorrect lifeline associations like the ones set up by OZW with target endpoint 1 will automatically get cleaned up during the process.

This strategy can be controlled with the `multiChannel` flag in the association config. `true` forces a multi channel association (if supported) and does not fall back to node associations. `false` forces a node association (if supported) and does not fall back to a node association.

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

## Migration from Yarn v1 to Yarn v3

We have migrated the repository to the latest version of `yarn`. This changes a few things, mainly regarding installing dependencies and editor support.
The repo is configured to automatically use the correct `typescript` dependency, but if anything goes wrong, please read [this](https://yarnpkg.com/getting-started/editor-sdks#vscode). Also check out the updated documentation on [developing locally / installing from GitHub](https://zwave-js.github.io/node-zwave-js/#/development/installing-from-github).

If something is wrong after the update, try this:

1.  Clean up package structure:
    ```bash
    yarn
    rm packages/*/*.tsbuildinfo
    rm -rf packages/*/build
    yarn build
    ```
2.  Reload your editor
3.  Choose the correct TypeScript version (workspace version, not VSCode's) for the language server

## Removed `neighbors` property from `ZWaveNode` class and removed `InterviewStage.Neighbors`

The static `neighbors` property was deprecated in `v7.9.0` and is now removed. Use `controller.getNodeNeighbors` to retrieve the neighbor lists on demand instead of accessing stale data. Furthermore, the interview stage `Neighbors` was removed too, because the information is no longer stored.

## Added missing `node` argument to nodes' `"statistics updated"` event

It was found that the `"statistics"` updated event for a `ZWaveNode` was the only event that did not include a reference to the node as the first callback argument. This has been changed, causing the statistics object to be the **second** argument now. The controller's event is unchanged.
