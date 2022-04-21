import { protocolVersionToSDKVersion } from "./ZWaveSDKVersions";

describe("protocolVersionToSDKVersion", () => {
	it("looks up the correct SDK version for a given protocol version", () => {
		expect(protocolVersionToSDKVersion("2.97")).toBe("4.51.0");
		expect(protocolVersionToSDKVersion("4.12")).toBe("6.60.0-beta");
	});

	it("falls back to the protocol version if the SDK version is not found", () => {
		expect(protocolVersionToSDKVersion("8.99")).toBe("8.99");
	});

	it("ensures a non-existant version is at least parsable with semver", () => {
		expect(protocolVersionToSDKVersion("99.01")).toBe("99.1");
	});

	it("finds protocol version 6.02", () => {
		expect(protocolVersionToSDKVersion("6.02")).toBe("6.81.1");
	});

	it("handles both the legacy x.0y and x.y.z versions", () => {
		expect(protocolVersionToSDKVersion("6.07")).toBe("6.81.6");
		expect(protocolVersionToSDKVersion("6.7.0")).toBe("6.81.6");
	});
});
