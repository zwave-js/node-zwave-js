# Migrating to v7

In version 8.x, we [INSERT XYZ], leading to several breaking changes.

Please follow this guide if you're migrating from v7. If migrating from v6, please see the v7 migration guide first.

## Skip UserCode Querying during Interview

We have changed the default interview behavior for the User Code Command Class to not query all user codes. This is intended to help save device battery as some devices may have hundreds of user codes, leading to significant battery drain during initial pairing of a new device and each subsequent restart.

Using `ZWaveOptions`, the interview behavior can be toggle back to query all codes if you wish to do so. You can still query individual codes after the node enters its `ready` state.

## Restructing of the Driver's ZWaveOptions Object

We have unified all interview behavior options under a single key (`interview`). _This is a breaking change_ if you were previously skipping interviewing by default. The new structure simply wraps the prior key inside `interview` and adds additional options as seen below:

```javascript
...
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
}

```
