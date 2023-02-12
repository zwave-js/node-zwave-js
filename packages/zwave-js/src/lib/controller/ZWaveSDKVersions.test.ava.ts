import test from "ava";
import { protocolVersionToSDKVersion } from "./ZWaveSDKVersions";

test("protocolVersionToSDKVersion() looks up the correct SDK version for a given protocol version", (t) => {
	t.is(protocolVersionToSDKVersion("2.97"), "4.51.0");
	t.is(protocolVersionToSDKVersion("4.12"), "6.60.0-beta");
});

test("protocolVersionToSDKVersion() falls back to the protocol version if the SDK version is not found", (t) => {
	t.is(protocolVersionToSDKVersion("8.99"), "8.99");
});

test("protocolVersionToSDKVersion() ensures a non-existent version is at least parsable with semver", (t) => {
	t.is(protocolVersionToSDKVersion("99.01"), "99.1");
});

test("protocolVersionToSDKVersion() finds protocol version 6.02", (t) => {
	t.is(protocolVersionToSDKVersion("6.02"), "6.81.1");
});

test("protocolVersionToSDKVersion() handles both the legacy x.0y and x.y.z versions", (t) => {
	t.is(protocolVersionToSDKVersion("6.07"), "6.81.6");
	t.is(protocolVersionToSDKVersion("6.7.0"), "6.81.6");
});
