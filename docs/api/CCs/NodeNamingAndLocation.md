# Node Naming and Location CC

?> CommandClass ID: `0x77`

## Node Naming and Location CC methods

### `getName`

```ts
async getName(): Promise<string | undefined>;
```

### `setName`

```ts
@validateArgs()
async setName(name: string): Promise<void>;
```

### `getLocation`

```ts
async getLocation(): Promise<string | undefined>;
```

### `setLocation`

```ts
@validateArgs()
async setLocation(location: string): Promise<void>;
```
