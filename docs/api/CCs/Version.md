# Version CC

## `get` method

```ts
async get(): Promise<Pick<VersionCCReport, "libraryType" | "protocolVersion" | "firmwareVersions" | "hardwareVersion"> | undefined>;
```

## `getCCVersion` method

```ts
async getCCVersion(
	requestedCC: CommandClasses,
): Promise<number | undefined>;
```

## `getCapabilities` method

```ts
async getCapabilities(): Promise<Pick<VersionCCCapabilitiesReport, "supportsZWaveSoftwareGet"> | undefined>;
```

## `getZWaveSoftware` method

```ts
async getZWaveSoftware(): Promise<Pick<VersionCCZWaveSoftwareReport, "sdkVersion" | "applicationFrameworkAPIVersion" | "applicationFrameworkBuildNumber" | "hostInterfaceVersion" | "hostInterfaceBuildNumber" | "zWaveProtocolVersion" | "zWaveProtocolBuildNumber" | "applicationVersion" | "applicationBuildNumber"> | undefined>;
```
