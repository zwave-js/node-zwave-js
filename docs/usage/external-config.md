# Specifying an external config DB location

Especially in Docker setups, the internal configuration DB location is not persisted for the lifetime of the application. This means that nightly configuration updates can get lost, either through re-creation of the container or on downstream updates.

By specifying the `ZWAVEJS_EXTERNAL_CONFIG` env variable to an external location, you can tell `zwave-js` to store its configuration DB there. Whenever `zwave-js` (re)loads the configuration on startup or after config updates, it will check if the external config dir is up to date and compatible with the current version. If not, the external config dir gets wiped and re-written.

> [!ATTENTION] This directory is meant to be **read-only** from a user perspective. Custom and test configurations should go into the directory defined by the driver option [`deviceConfigPriorityDir`](api/driver.md#ZWaveOptions).
