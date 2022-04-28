import { ConfigManager } from "../ConfigManager";
import { ConditionalDeviceConfig } from "./DeviceConfig";

describe("lib/config/Devices", () => {
	describe("ConditionalDeviceConfig", () => {
		it("parses a simple device config", () => {
			const json = {
				manufacturer: "Silicon Labs",
				manufacturerId: "0x0000",
				label: "ZST10-700",
				description: "700 Series-based Controller",
				devices: [
					{
						productType: "0x0004",
						productId: "0x0004",
					},
				],
				firmwareVersion: {
					min: "0.0",
					max: "255.255",
				},
			};

			const condConfig = new ConditionalDeviceConfig(
				"test.json",
				true,
				json,
			);
			// Ensure that the config is parsed correctly
			expect(condConfig.manufacturer).toBe("Silicon Labs");
			expect(condConfig.label).toBe("ZST10-700");
			expect(condConfig.description).toBe("700 Series-based Controller");
			expect(condConfig.firmwareVersion).toMatchObject({
				min: "0.0",
				max: "255.255",
			});
		});

		it("parses a device config with conditional manufacturer, label and description", () => {
			const json = {
				manufacturer: [
					{ $if: "firmwareVersion < 1.0", value: "Silicon Labs" },
					"Z-Wave JS",
				],
				manufacturerId: "0x0000",
				label: [
					{ $if: "firmwareVersion < 1.0", value: "ZST10-700" },
					"ZST10-700 rev. 2",
				],
				description: [
					{
						$if: "firmwareVersion < 1.0",
						value: "700 Series-based Controller",
					},
					"815 Series-based Controller",
				],
				devices: [
					{
						productType: "0x0004",
						productId: "0x0004",
					},
				],
				firmwareVersion: {
					min: "0.0",
					max: "255.255",
				},
			};

			const condConfig = new ConditionalDeviceConfig(
				"test.json",
				true,
				json,
			);
			// Ensure that the config is parsed correctly
			expect(condConfig.manufacturer).toHaveLength(2);
			expect(condConfig.label).toHaveLength(2);
			expect(condConfig.description).toHaveLength(2);
			expect(condConfig.firmwareVersion).toMatchObject({
				min: "0.0",
				max: "255.255",
			});

			// and that evaluating it works
			const deviceId = {
				manufacturerId: 0x0000,
				productType: 0x0004,
				productId: 0x0004,
			};

			const evaluated1 = condConfig.evaluate({
				...deviceId,
				firmwareVersion: "0.5",
			});
			expect(evaluated1.manufacturer).toBe("Silicon Labs");
			expect(evaluated1.label).toBe("ZST10-700");
			expect(evaluated1.description).toBe("700 Series-based Controller");

			const evaluated2 = condConfig.evaluate({
				...deviceId,
				firmwareVersion: "1.0",
			});
			expect(evaluated2.manufacturer).toBe("Z-Wave JS");
			expect(evaluated2.label).toBe("ZST10-700 rev. 2");
			expect(evaluated2.description).toBe("815 Series-based Controller");
		});

		it("parses a device config with conditional metadata", () => {
			const json = {
				manufacturer: "Silicon Labs",
				manufacturerId: "0x0000",
				label: "ZST10-700",
				description: "700 Series-based Controller",
				devices: [
					{
						productType: "0x0004",
						productId: "0x0004",
					},
				],
				firmwareVersion: {
					min: "0.0",
					max: "255.255",
				},
				metadata: {
					reset: [
						{
							$if: "firmwareVersion < 1.0",
							value: "Press any key to continue...",
						},
					],
					comments: [
						{
							$if: "firmwareVersion < 1.0",
							level: "warning",
							text: "Join the dark side!",
						},
						{
							$if: "firmwareVersion >= 1.0",
							level: "info",
							text: "Good, good...",
						},
					],
				},
			};

			const condConfig = new ConditionalDeviceConfig(
				"test.json",
				true,
				json,
			);
			// Ensure that evaluating the config works
			const deviceId = {
				manufacturerId: 0x0000,
				productType: 0x0004,
				productId: 0x0004,
			};

			const evaluated1 = condConfig.evaluate({
				...deviceId,
				firmwareVersion: "0.5",
			});
			expect(evaluated1.metadata?.reset).toBe(
				"Press any key to continue...",
			);
			expect(evaluated1.metadata?.comments).toEqual([
				{
					level: "warning",
					text: "Join the dark side!",
				},
			]);

			const evaluated2 = condConfig.evaluate({
				...deviceId,
				firmwareVersion: "1.0",
			});
			expect(evaluated2.metadata?.reset).toBeUndefined();
			expect(evaluated2.metadata?.comments).toEqual([
				{
					level: "info",
					text: "Good, good...",
				},
			]);
		});

		it("parses a device config with conditional compat flags", () => {
			const json = {
				manufacturer: "Silicon Labs",
				manufacturerId: "0x0000",
				label: "ZST10-700",
				description: "700 Series-based Controller",
				devices: [
					{
						productType: "0x0004",
						productId: "0x0004",
					},
				],
				firmwareVersion: {
					min: "0.0",
					max: "255.255",
				},
				compat: [
					{
						$if: "firmwareVersion < 1.0",
						enableBasicSetMapping: true,
					},
				],
			};

			const condConfig = new ConditionalDeviceConfig(
				"test.json",
				true,
				json,
			);
			// Ensure that evaluating the config works
			const deviceId = {
				manufacturerId: 0x0000,
				productType: 0x0004,
				productId: 0x0004,
			};

			const evaluated1 = condConfig.evaluate({
				...deviceId,
				firmwareVersion: "0.5",
			});
			expect(evaluated1.compat).toEqual({
				enableBasicSetMapping: true,
			});

			const evaluated2 = condConfig.evaluate({
				...deviceId,
				firmwareVersion: "1.0",
			});
			expect(evaluated2.compat).toBeUndefined();
		});

		it("parses a device config with conditional config parameter options", () => {
			const json = {
				manufacturer: "Silicon Labs",
				manufacturerId: "0x0000",
				label: "ZST10-700",
				description: "700 Series-based Controller",
				devices: [
					{
						productType: "0x0004",
						productId: "0x0004",
					},
				],
				firmwareVersion: {
					min: "0.0",
					max: "255.255",
				},
				paramInformation: [
					{
						"#": "1",
						label: "This is a parameter",
						valueSize: 1,
						defaultValue: 1,
						allowManualEntry: false,
						options: [
							{
								label: "Yes",
								value: 1,
							},
							{
								label: "No",
								value: 2,
							},
							{
								$if: "firmwareVersion < 1.0",
								label: "Maybe",
								value: 3,
							},
						],
					},
				],
			};

			const condConfig = new ConditionalDeviceConfig(
				"test.json",
				true,
				json,
			);
			// Ensure that evaluating the config works
			const deviceId = {
				manufacturerId: 0x0000,
				productType: 0x0004,
				productId: 0x0004,
			};

			const evaluated1 = condConfig.evaluate({
				...deviceId,
				firmwareVersion: "0.5",
			});
			expect(
				evaluated1.paramInformation?.get({ parameter: 1 })?.options,
			).toEqual([
				{
					label: "Yes",
					value: 1,
				},
				{
					label: "No",
					value: 2,
				},
				{
					label: "Maybe",
					value: 3,
				},
			]);

			const evaluated2 = condConfig.evaluate({
				...deviceId,
				firmwareVersion: "1.0",
			});
			expect(
				evaluated2.paramInformation?.get({ parameter: 1 })?.options,
			).toEqual([
				{
					label: "Yes",
					value: 1,
				},
				{
					label: "No",
					value: 2,
				},
			]);
		});

		it("supports x.y.z firmware versions", () => {
			const json = {
				manufacturer: "Silicon Labs",
				manufacturerId: "0x0000",
				label: "ZST10-700",
				description: "700 Series-based Controller",
				devices: [
					{
						productType: "0x0004",
						productId: "0x0004",
					},
				],
				firmwareVersion: {
					min: "0.0",
					max: "255.255",
				},
				metadata: {
					comments: [
						{
							$if: "firmwareVersion < 7.17.2",
							level: "warning",
							text: "Woah, this is buggy!",
						},
					],
				},
			};

			const condConfig = new ConditionalDeviceConfig(
				"test.json",
				true,
				json,
			);
			// Ensure that evaluating the config works
			const deviceId = {
				manufacturerId: 0x0000,
				productType: 0x0004,
				productId: 0x0004,
			};

			const evaluatedXY_warning = condConfig.evaluate({
				...deviceId,
				firmwareVersion: "7.17",
			});
			expect(evaluatedXY_warning.metadata?.comments).toHaveLength(1);

			const evaluatedXY_ok = condConfig.evaluate({
				...deviceId,
				firmwareVersion: "7.18",
			});
			expect(evaluatedXY_ok.metadata?.comments).toBeEmpty();

			const evaluatedXYZ_warning = condConfig.evaluate({
				...deviceId,
				firmwareVersion: "7.17.1",
			});
			expect(evaluatedXYZ_warning.metadata?.comments).toHaveLength(1);

			const evaluatedXYZ_ok = condConfig.evaluate({
				...deviceId,
				firmwareVersion: "7.17.2",
			});
			expect(evaluatedXYZ_ok.metadata?.comments).toBeEmpty();
		});
	});

	describe("lookupDevice (regression tests)", () => {
		it("Z-TRM3 with commandClasses.add compat should work", async () => {
			// This test might take a while
			const configManager = new ConfigManager();
			const config = await configManager.lookupDevice(
				0x019b,
				0x0003,
				0x0203,
				"4.0",
			);
			expect(config).not.toBeUndefined();
			expect(config?.compat?.addCCs?.get(49)?.endpoints.size).toBe(3);
		}, 60000);

		it("Associations on endpoints should work - including imports", async () => {
			// Logic Group ZDB5100

			// This test might take a while
			const configManager = new ConfigManager();
			const config = await configManager.lookupDevice(
				0x0234,
				0x0003,
				0x0121,
				"0.0",
			);
			expect(config).not.toBeUndefined();
			expect(
				config?.endpoints?.get(0)?.associations?.get(2),
			).toMatchObject({
				label: "Button 1 (Basic Report)",
				maxNodes: 5,
			});
			expect(
				config?.endpoints?.get(1)?.associations?.get(1),
			).toMatchObject({
				label: "Lifeline",
				maxNodes: 5,
				isLifeline: false,
			});
			expect(
				config?.endpoints?.get(4)?.associations?.get(3),
			).toMatchObject({
				label: "Button 4 (Binary Switch Set)",
				maxNodes: 5,
			});
		}, 60000);
	});
});
