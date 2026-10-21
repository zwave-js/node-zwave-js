import {
	CommandClasses,
	type MulticastDestination,
	ValueDB,
	encodeFloatWithScale,
} from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared";
import { describe, expect, test } from "vitest";

import { CCRaw, type PersistValuesContext } from "../lib/CommandClass.js";
import {
	ThermostatSetpointCommand,
	ThermostatSetpointType,
} from "../lib/_Types.js";
import type { CCEncodingContext, CCParsingContext } from "../lib/traits.js";

import {
	ThermostatSetpointCCCapabilitiesReport,
	ThermostatSetpointCCReport,
	ThermostatSetpointCCSet,
	ThermostatSetpointCCValues,
} from "./ThermostatSetpointCC.js";

const ccId = CommandClasses["Thermostat Setpoint"];
const observedId = ThermostatSetpointCCValues.observedFloatEncodings.id;

function setup() {
	const valueDB = new ValueDB(2, new Map() as any, new Map() as any);
	const otherValueDB = new ValueDB(3, new Map() as any, new Map() as any);
	const ctx = {
		sourceNodeId: 2,
		getValueDB: (nodeId: number) => (nodeId === 2 ? valueDB : otherValueDB),
		tryGetValueDB: (nodeId: number) =>
			nodeId === 2 ? valueDB : otherValueDB,
		getSupportedCCVersion: () => 3,
	} as unknown as CCEncodingContext & CCParsingContext & PersistValuesContext;

	function report(
		precision: number,
		size: number,
		scale = 0,
		type = ThermostatSetpointType.Heating,
		endpoint = 0,
	) {
		const cc = ThermostatSetpointCCReport.from(
			new CCRaw(
				ccId,
				ThermostatSetpointCommand.Report,
				Bytes.from([
					type,
					(precision << 5) | (scale << 3) | size,
					...Array(size).fill(0),
				]),
			),
			ctx,
		);
		cc.endpointIndex = endpoint;
		expect(cc.persistValues(ctx)).toBe(true);
		return cc;
	}

	async function encode(
		value: number,
		scale = 0,
		nodeId: number | MulticastDestination = 2,
	) {
		const cc = new ThermostatSetpointCCSet({
			nodeId,
			endpointIndex: 3,
			setpointType: ThermostatSetpointType.Cooling,
			value,
			scale,
		});
		return (await cc.serialize(ctx)).subarray(3);
	}

	return { ctx, valueDB, report, encode };
}

describe("Thermostat Setpoint float encodings", () => {
	test("S2 followups retain the multicast encoding after nodeId changes", async () => {
		const { ctx, report } = setup();
		report(0, 1);
		ctx.getValueDB(3).setValue(observedId, [
			{ precision: 2, scale: 0, size: 4 },
		]);
		const cc = new ThermostatSetpointCCSet({
			nodeId: [2, 3],
			setpointType: ThermostatSetpointType.Heating,
			value: 21.55,
			scale: 0,
		});
		const multicast = await cc.serialize(ctx);
		for (const nodeId of [2, 3, 2]) {
			cc.nodeId = nodeId;
			cc.prepareRetransmission();
			expect(await cc.serialize(ctx)).toEqual(multicast);
			expect(cc.value).toBe(21.55);
		}
	});

	test("retries retain the first encoding when observations change", async () => {
		const { ctx, report } = setup();
		const cc = new ThermostatSetpointCCSet({
			nodeId: 2,
			setpointType: ThermostatSetpointType.Heating,
			value: 21.55,
			scale: 0,
		});
		const initial = await cc.serialize(ctx);
		report(0, 1);
		cc.prepareRetransmission();
		expect(await cc.serialize(ctx)).toEqual(initial);
		expect(cc.value).toBe(21.55);
		const next = new ThermostatSetpointCCSet({
			nodeId: 2,
			setpointType: ThermostatSetpointType.Heating,
			value: 21.55,
			scale: 0,
		});
		expect((await next.serialize(ctx)).subarray(3)).toEqual(
			Bytes.from([1, 22]),
		);
		expect(next.value).toBe(22);
	});

	test("failed encoding does not prevent learning a usable encoding", async () => {
		const { ctx, report } = setup();
		report(0, 1);
		const cc = new ThermostatSetpointCCSet({
			nodeId: 2,
			setpointType: ThermostatSetpointType.Heating,
			value: 128,
			scale: 0,
		});
		expect(() => cc.serialize(ctx)).toThrow();
		report(0, 2);
		expect((await cc.serialize(ctx)).subarray(3)).toEqual(
			Bytes.from([2, 0, 128]),
		);
	});

	test("retains raw encodings globally across endpoints and types", async () => {
		const { valueDB, report, encode } = setup();
		report(1, 2, 0, ThermostatSetpointType.Heating, 1);
		report(3, 4, 1, ThermostatSetpointType.Cooling, 2);
		report(1, 2);
		expect(valueDB.getValue(observedId)).toEqual([
			{ precision: 1, size: 2, scale: 0 },
			{ precision: 3, size: 4, scale: 1 },
		]);
		expect(
			valueDB
				.getValues(ccId)
				.filter((value) => value.property === observedId.property),
		).toHaveLength(1);
		expect(
			valueDB
				.getValues(ccId)
				.find((value) => value.property === observedId.property)
				?.endpoint,
		).toBe(0);
		expect(await encode(21)).toEqual(Bytes.from([0x22, 0, 210]));
		expect(await encode(21, 0, 3)).toEqual(encodeFloatWithScale(21, 0));
	});

	test("learns both capability bounds including their distinct scales", () => {
		const { ctx, valueDB } = setup();
		const cc = ThermostatSetpointCCCapabilitiesReport.from(
			new CCRaw(
				ccId,
				ThermostatSetpointCommand.CapabilitiesReport,
				Bytes.from([1, 0x22, 0, 50, 0x4c, 0, 0, 0x23, 0x28]),
			),
			ctx,
		);
		cc.endpointIndex = 4;
		cc.persistValues(ctx);
		expect(valueDB.getValue(observedId)).toEqual([
			{ precision: 1, size: 2, scale: 0 },
			{ precision: 2, size: 4, scale: 1 },
		]);
		expect(cc.minValue).toBe(5);
		expect(cc.maxValue).toBe(90);
	});

	test("uses observations restored from the value cache", async () => {
		const first = setup();
		first.report(2, 2);
		const restored = setup();
		restored.valueDB.setValue(
			observedId,
			JSON.parse(JSON.stringify(first.valueDB.getValue(observedId))),
		);
		expect(await restored.encode(21.567)).toEqual(
			Bytes.from([0x42, 8, 0x6d]),
		);
		restored.report(0, 1);
		expect(restored.valueDB.getValue(observedId)).toEqual([
			{ precision: 2, size: 2, scale: 0 },
			{ precision: 0, size: 1, scale: 0 },
		]);
	});

	test("ignores N/A responses without float payloads", () => {
		const { ctx, valueDB } = setup();
		ThermostatSetpointCCReport.from(
			new CCRaw(ccId, ThermostatSetpointCommand.Report, Bytes.from([0])),
			ctx,
		).persistValues(ctx);
		ThermostatSetpointCCCapabilitiesReport.from(
			new CCRaw(
				ccId,
				ThermostatSetpointCommand.CapabilitiesReport,
				Bytes.from([0]),
			),
			ctx,
		).persistValues(ctx);
		expect(valueDB.getValues(ccId)).toEqual([]);
	});

	test("ignores N/A reports and capabilities", () => {
		const { ctx, valueDB, report } = setup();
		report(7, 4, 0, ThermostatSetpointType["N/A"]);
		const cc = ThermostatSetpointCCCapabilitiesReport.from(
			new CCRaw(
				ccId,
				ThermostatSetpointCommand.CapabilitiesReport,
				Bytes.from([0, 1, 0, 1, 0]),
			),
			ctx,
		);
		cc.persistValues(ctx);
		expect(valueDB.getValue(observedId)).toBeUndefined();
		expect(valueDB.getValues(ccId)).toEqual([]);
	});

	test.each([
		[1, 2, 21, [0x22, 0, 210]],
		[1, 2, 21.26, [0x22, 0, 213]],
		[1, 2, -21.26, [0x22, 0xff, 0x2b]],
		[2, 4, 21, [0x44, 0, 0, 8, 0x34]],
		[0, 3, 40000, [3, 0, 0x9c, 0x40]],
		[0, 3, -40000, [3, 0xff, 0x63, 0xc0]],
		[7, 4, 21.12345678, [0xe4, 0x0c, 0x97, 0x2f, 0x08]],
	])(
		"uses precision %i and size %i for %s",
		async (precision, size, value, bytes) => {
			const { report, encode } = setup();
			report(precision, size);
			expect(await encode(value)).toEqual(Bytes.from(bytes));
		},
	);

	test("preserves representable precision without inventing combinations", async () => {
		const { report, encode } = setup();
		report(0, 1);
		report(2, 4);
		expect(await encode(21)).toEqual(Bytes.from([1, 21]));
		expect(await encode(21.5)).toEqual(Bytes.from([0x44, 0, 0, 8, 0x66]));
		expect(await encode(21.567)).toEqual(Bytes.from([0x44, 0, 0, 8, 0x6d]));
	});

	test("uses a fitting observed combination when higher precision overflows", async () => {
		const { report, encode } = setup();
		report(2, 1);
		report(0, 2);
		expect(await encode(21.5)).toEqual(Bytes.from([2, 0, 22]));
	});

	test.each([128, -129, 127.5, Infinity, NaN])(
		"rejects %s when no observed encoding fits",
		async (value) => {
			const { report, encode } = setup();
			report(0, 1);
			await expect(encode(value)).rejects.toThrow(
				"any observed float encoding",
			);
		},
	);

	test("respects signed size limits", async () => {
		const { report, encode } = setup();
		report(0, 1);
		expect(await encode(127)).toEqual(Bytes.from([1, 127]));
		expect(await encode(-128)).toEqual(Bytes.from([1, 128]));
	});

	test("uses only encodings reported for the requested scale", async () => {
		const { report, encode } = setup();
		report(0, 1, 0);
		report(2, 2, 1);
		expect(await encode(21.55, 0)).toEqual(Bytes.from([1, 22]));
		expect(await encode(21.55, 1)).toEqual(Bytes.from([0x4a, 8, 0x6b]));
	});

	test("falls back without observations, a matching scale, or a singlecast node", async () => {
		const { ctx, report, encode } = setup();
		const automatic = encodeFloatWithScale(21.55, 0);
		expect(await encode(21.55)).toEqual(automatic);
		report(0, 1, 1);
		expect(await encode(21.55)).toEqual(automatic);
		report(0, 1);
		expect(await encode(21.55, 0, [2, 3])).toEqual(automatic);
		const withoutValueDB = { ...ctx } as CCEncodingContext;
		delete withoutValueDB.tryGetValueDB;
		expect(
			await new ThermostatSetpointCCSet({
				nodeId: 2,
				setpointType: ThermostatSetpointType.Heating,
				value: 21.55,
				scale: 0,
			}).serialize(withoutValueDB),
		).toEqual(
			Bytes.concat([
				[
					ccId,
					ThermostatSetpointCommand.Set,
					ThermostatSetpointType.Heating,
				],
				automatic,
			]),
		);
		ctx.tryGetValueDB = () => undefined;
		expect(await encode(21.55)).toEqual(automatic);
	});

	test.each([{ precision: 3 }, { size: 4 }, { precision: 2, size: 2 }])(
		"prioritizes explicit float overrides %j",
		async (override) => {
			const { ctx, report, encode } = setup();
			report(0, 1);
			ctx.getDeviceConfig = () =>
				({
					compat: { overrideFloatEncoding: override },
				}) as ReturnType<CCEncodingContext["getDeviceConfig"]>;
			expect(await encode(21.55)).toEqual(
				encodeFloatWithScale(21.55, 0, override),
			);
		},
	);

	test.each([
		[1, 0],
		[1, 5, 0, 0, 0, 0, 0],
		[1, 2, 0],
	])("rejects invalid float payload %j", (...payload) => {
		const { ctx } = setup();
		expect(() =>
			ThermostatSetpointCCReport.from(
				new CCRaw(
					ccId,
					ThermostatSetpointCommand.Report,
					Bytes.from(payload),
				),
				ctx,
			),
		).toThrow();
	});
});
