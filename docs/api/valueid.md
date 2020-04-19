# ValueID

The `ValueID` interface uniquely identifies to which CC, endpoint and property a value belongs to:

```ts
interface ValueID {
	commandClass: CommandClasses;
	endpoint?: number;
	property: number | string;
	propertyKey?: number | string;
}
```

It has four properties:

-   `commandClass` - The numeric identifier of the command class.
-   `endpoint` - _(optional)_ The index of the node's endpoint (sub-device). `0` addresses the root device, `>= 1` one of the single endpoints.
-   `property` - The name (or a numeric identifier) of the property, for example `targetValue`
-   `propertyKey` - _(optional)_ Allows sub-addressing properties that contain multiple values (like combined sensors).

# TranslatedValueID {docsify-ignore}

Since both `property` and `propertyKey` can be cryptic, value IDs are exposed to consuming applications in a "translated" form, which contains all properties from `ValueID` plus the following ones:

```ts
interface TranslatedValueID extends ValueID {
	commandClassName: string;
	propertyName?: string;
	propertyKeyName?: string;
}
```

These properties are meant to provide a human-readable representation of the Command Class, property and property key.
