import { isArray } from "alcalzone-shared/typeguards";
import test from "ava";
import { ConditionalDeviceConfig } from "./DeviceConfig";

test("parses a simple device config", (t) => {
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

	const condConfig = new ConditionalDeviceConfig("test.json", true, json);
	// Ensure that the config is parsed correctly
	t.is(condConfig.manufacturer, "Silicon Labs");
	t.is(condConfig.label, "ZST10-700");
	t.is(condConfig.description, "700 Series-based Controller");
	t.deepEqual(condConfig.firmwareVersion, {
		min: "0.0",
		max: "255.255",
	});
});

test("parses a device config with conditional manufacturer, label and description", (t) => {
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

	const condConfig = new ConditionalDeviceConfig("test.json", true, json);
	// Ensure that the config is parsed correctly
	t.is(condConfig.manufacturer.length, 2);
	t.is(condConfig.label.length, 2);
	t.is(condConfig.description.length, 2);
	t.like(condConfig.firmwareVersion, {
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
	t.is(evaluated1.manufacturer, "Silicon Labs");
	t.is(evaluated1.label, "ZST10-700");
	t.is(evaluated1.description, "700 Series-based Controller");

	const evaluated2 = condConfig.evaluate({
		...deviceId,
		firmwareVersion: "1.0",
	});
	t.is(evaluated2.manufacturer, "Z-Wave JS");
	t.is(evaluated2.label, "ZST10-700 rev. 2");
	t.is(evaluated2.description, "815 Series-based Controller");
});

test("parses a device config with conditional metadata", (t) => {
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

	const condConfig = new ConditionalDeviceConfig("test.json", true, json);
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
	t.is(evaluated1.metadata?.reset, "Press any key to continue...");
	t.deepEqual(evaluated1.metadata?.comments, [
		{
			level: "warning",
			text: "Join the dark side!",
		},
	]);

	const evaluated2 = condConfig.evaluate({
		...deviceId,
		firmwareVersion: "1.0",
	});
	t.is(evaluated2.metadata?.reset, undefined);
	t.deepEqual(evaluated2.metadata?.comments, [
		{
			level: "info",
			text: "Good, good...",
		},
	]);
});

test("parses a device config with conditional compat flags", (t) => {
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

	const condConfig = new ConditionalDeviceConfig("test.json", true, json);
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
	t.deepEqual(evaluated1.compat, {
		enableBasicSetMapping: true,
	});

	const evaluated2 = condConfig.evaluate({
		...deviceId,
		firmwareVersion: "1.0",
	});
	t.is(evaluated2.compat, undefined);
});

test("parses a device config with conditional config parameter options", (t) => {
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

	const condConfig = new ConditionalDeviceConfig("test.json", true, json);
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
	t.deepEqual(evaluated1.paramInformation?.get({ parameter: 1 })?.options, [
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
	t.deepEqual(evaluated2.paramInformation?.get({ parameter: 1 })?.options, [
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

test("supports x.y.z firmware versions", (t) => {
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

	const condConfig = new ConditionalDeviceConfig("test.json", true, json);
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
	t.is(
		isArray(evaluatedXY_warning.metadata?.comments) &&
			evaluatedXY_warning.metadata?.comments.length,
		1,
	);

	const evaluatedXY_ok = condConfig.evaluate({
		...deviceId,
		firmwareVersion: "7.18",
	});
	t.is(
		isArray(evaluatedXY_ok.metadata?.comments) &&
			evaluatedXY_ok.metadata?.comments.length,
		0,
	);

	const evaluatedXYZ_warning = condConfig.evaluate({
		...deviceId,
		firmwareVersion: "7.17.1",
	});
	t.is(
		isArray(evaluatedXYZ_warning.metadata?.comments) &&
			evaluatedXYZ_warning.metadata?.comments.length,
		1,
	);

	const evaluatedXYZ_ok = condConfig.evaluate({
		...deviceId,
		firmwareVersion: "7.17.2",
	});
	t.is(
		isArray(evaluatedXYZ_ok.metadata?.comments) &&
			evaluatedXYZ_ok.metadata?.comments.length,
		0,
	);
});
