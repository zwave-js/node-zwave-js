# Migrating to v10

What started out as an attempt to improve the testing setup, resulted in a huge refactor of the entire code base.

The implementations of serial messages and Command Classes have been decoupled from the `Driver`, `ZWaveNode` and `Endpoint` classes and no longer store direct references to them. Instead, most of the implementations now operate on abstractions:

-   `ZWaveHost` - A barebones abstraction of the environment, e.g. for simple test cases
-   `ZWaveApplicationHost` - A feature abstraction of the host environment with access to value DBs, other nodes, configuration, etc. `Driver` is an implementation of this abstraction.
-   `ZWaveEndpointBase` - A barebones abstraction of a Z-Wave endpoint
-   `ZWaveNodeBase` - A barebones abstraction of a Z-Wave node. Similar to how `ZWaveNode` is an `Endpoint`, `ZWaveNodeBase` is an `ZWaveEndpointBase`

The methods that do require access to the driver now accept a `ZWaveApplicationHost` as the first argument, which is a more featureful abstraction than the `ZWaveHost` class.
For many use cases, these changes should not affect applications, unless they are using some CC methods directly. The `commandClasses` APIs are unchanged.

## CC implementations: several methods take a `ZWaveApplicationHost` as the first argument

Old signature:

```ts
public async interview(): Promise<void>;
public async refreshValues(): Promise<void>;
public persistValues(): boolean;
public toLogEntry(): MessageOrCCLogEntry;

public getDefinedValueIDs(): ValueID[];
public translateProperty(
	property: string | number,
	propertyKey?: string | number,
): string | undefined;
public translatePropertyKey(
	property: string | number,
	propertyKey?: string | number,
): string | undefined;
```

New signatures:

```ts
public async interview(driver: Driver): Promise<void>;
public async refreshValues(driver: Driver): Promise<void>;
public persistValues(applHost: ZWaveApplicationHost): boolean;
public toLogEntry(driver: Driver): MessageOrCCLogEntry;

public getDefinedValueIDs(applHost: ZWaveApplicationHost): ValueID[];
public translateProperty(
	applHost: ZWaveApplicationHost,
	property: string | number,
	propertyKey?: string | number,
): string | undefined;
public translatePropertyKey(
	applHost: ZWaveApplicationHost,
	property: string | number,
	propertyKey?: string | number,
): string | undefined;
```

Simply pass the driver instance as the first argument whereever you call these methods.

**Note:** `getDefinedValueIDs` on the `ZWaveNode` class is **not** affected.

# CC-specific methods to read certain values from cache are now static take additional arguments

Some CC implementations expose value-specific methods to read certain values from cache, for example `getNumValvesCached` on the `Irrigation CC`. Previously some of those were protected, some were public. Now all of them are public, `static` on the CC base class, take additional arguments and include `undefined` in the return type:

Old signature:

```ts
protected getNumValvesCached(): number;
```

New signature:

```ts
public static getNumValvesCached(
	applHost: ZWaveApplicationHost,
	endpoint: ZWaveEndpointBase,
): number | undefined;
```

The same is true for several other similar methods on several other CCs. To use them from application code, simply pass the `Driver` and `Endpoint` or `ZWaveNode` instance:

```diff
- irrgCCInstance.getNumValvesCached();
+ IrrigationCC.getNumValvesCached(driver, endpoint);
```

# The `valueFormat` property in `ConfigurationCCBulkSetOptions` no longer defaults to the last stored format

Instead, if no `valueFormat` is passed, the default will be `SignedInteger` according to the specification. This change does not affect `setBulk` calls through the `commandClasses` API.

# `CommandClass.interviewComplete` is no longer a property

Instead, two methods are used in its place:

Old:

```ts
if (!instance.interviewComplete) {
	instance.interviewComplete = true;
}
```

New signature:

```ts
if (!instance.isInterviewComplete(applHost)) {
	instance.setInterviewComplete(applHost, true);
}
```

# `NotificationCC.notificationMode` is no longer a property

Instead, a static method on the `Notification CC` is used in its place:

```ts
// On NotificationCC
public static getNotificationMode(
	applHost: ZWaveApplicationHost,
	node: ZWaveNodeBase,
): "push" | "pull" | undefined;
```

# The max. send attempts in SendData messages now defaults to 1 instead of the driver option

If you're constructing `SendData[Bridge][Multicast]Request`s manually, the `maxSendAttempts` property now needs to be set if more than 1 attempts are desired.
The driver does this automatically when using the `sendCommand` method, so most use cases should not be affected.
