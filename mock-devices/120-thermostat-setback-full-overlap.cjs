// @ts-check
// Tests Thermostat Mode + Setpoint CCs with full overlap and Setback support.
const { CommandClasses } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");
const { ThermostatMode, ThermostatSetpointType } = require("zwave-js");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 120,
			capabilities: {
				commandClasses: [
					{ ccId: CommandClasses.Version, version: 3 },
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "Thermostat Full",
					}),
					ccCaps({
						ccId: CommandClasses["Thermostat Mode"],
						version: 3,
						supportedModes: [
							ThermostatMode.Heat,
							ThermostatMode.Cool,
						],
					}),
					ccCaps({
						ccId: CommandClasses["Thermostat Setpoint"],
						version: 3,
						setpoints: {
							[ThermostatSetpointType.Heating]: {
								minValue: 10,
								maxValue: 30,
								defaultValue: 20,
								scale: "°C",
							},
							[ThermostatSetpointType.Cooling]: {
								minValue: 18,
								maxValue: 28,
								defaultValue: 22,
								scale: "°C",
							},
						},
					}),
					{
						ccId: CommandClasses["Thermostat Setback"],
						version: 1,
					},
				],
			},
		},
	],
};
