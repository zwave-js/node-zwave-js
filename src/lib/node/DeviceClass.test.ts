import { GenericDeviceClass, GenericDeviceClasses, SpecificDeviceClass } from "./DeviceClass";

describe("lib/node/DeviceClass", () => {
	describe("GenericDeviceClass.get()", () => {
		it("returns a GenericDeviceClass with the correct key", () => {
			const gdc = GenericDeviceClass.get(GenericDeviceClasses["Alarm Sensor"]);
			expect(gdc.key).toBe(GenericDeviceClasses["Alarm Sensor"]);
		});

		it("returns a predefined GenericDeviceClass if it exists", () => {
			const gdc = GenericDeviceClass.get(GenericDeviceClasses["Alarm Sensor"]);
			expect(gdc.name).toBe("Alarm Sensor");
		});

		it("returns a GenericDeviceClass with name UNKNOWN if it doesn't", () => {
			const gdc = GenericDeviceClass.get(0x00);
			expect(gdc.name).toMatch(/UNKNOWN/);
			expect(gdc.name).toMatch(/0x00/);
		});
	});

	describe("SpecificDeviceClass.get()", () => {
		it("returns a SpecificDeviceClass with the correct key", () => {
			const sdc = SpecificDeviceClass.get(GenericDeviceClasses["Alarm Sensor"], 0x01);
			expect(sdc.key).toBe(0x01);
		});

		it("returns a predefined SpecificDeviceClass if it exists", () => {
			const sdc = SpecificDeviceClass.get(GenericDeviceClasses["Alarm Sensor"], 0x01);
			expect(sdc.name).toBe("Basic Routing Alarm Sensor");
		});

		it("returns a SpecificDeviceClass with name UNKNOWN if either the GDC or the SDC doesn't exist", () => {
			let sdc = SpecificDeviceClass.get(0x00, 0x01);
			expect(sdc.name).toMatch(/UNKNOWN/);
			expect(sdc.name).toMatch(/0x01/);

			sdc = SpecificDeviceClass.get(GenericDeviceClasses["Alarm Sensor"], 0xff);
			expect(sdc.name).toMatch(/UNKNOWN/);
			expect(sdc.name).toMatch(/0xff/);
		});
	});
});
