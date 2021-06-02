# Version CC

?> CommandClass ID: `0x86`

## Version CC methods

### `get`

```ts
async get(): Promise<Pick<VersionCCReport, "libraryType" | "protocolVersion" | "firmwareVersions" | "hardwareVersion"> | undefined>;
```

### `getCCVersion`

```ts
async getCCVersion(
	requestedCC: CommandClasses,
): Promise<number | undefined>;
```

### `getCapabilities`

```ts
async getCapabilities(): Promise<Pick<VersionCCCapabilitiesReport, "supportsZWaveSoftwareGet"> | undefined>;
```

### `getZWaveSoftware`

```ts
async getZWaveSoftware(): Promise<Pick<VersionCCZWaveSoftwareReport, "sdkVersion" | "applicationFrameworkAPIVersion" | "applicationFrameworkBuildNumber" | "hostInterfaceVersion" | "hostInterfaceBuildNumber" | "zWaveProtocolVersion" | "zWaveProtocolBuildNumber" | "applicationVersion" | "applicationBuildNumber"> | undefined>;
```
