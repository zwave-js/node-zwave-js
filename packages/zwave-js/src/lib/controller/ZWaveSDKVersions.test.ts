import { test } from "vitest";
import { protocolVersionToSDKVersion } from "./ZWaveSDKVersions.js";

test("protocolVersionToSDKVersion() looks up the correct SDK version for a given protocol version", (t) => {
	t.expect(protocolVersionToSDKVersion("2.97")).toBe("4.51.0");
	t.expect(protocolVersionToSDKVersion("4.12")).toBe("6.60.0-beta");
});

test("protocolVersionToSDKVersion() falls back to the protocol version if the SDK version is not found", (t) => {
	t.expect(protocolVersionToSDKVersion("8.99")).toBe("8.99");
});

test("protocolVersionToSDKVersion() ensures a non-existent version is at least parsable with semver", (t) => {
	t.expect(protocolVersionToSDKVersion("99.01")).toBe("99.1");
});

test("protocolVersionToSDKVersion() finds protocol version 6.02", (t) => {
	t.expect(protocolVersionToSDKVersion("6.02")).toBe("6.81.1");
});

test("protocolVersionToSDKVersion() handles both the legacy x.0y and x.y.z versions", (t) => {
	t.expect(protocolVersionToSDKVersion("6.07")).toBe("6.81.6");
	t.expect(protocolVersionToSDKVersion("6.7.0")).toBe("6.81.6");
});
