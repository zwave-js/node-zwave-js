import { getErrorMessage } from "@zwave-js/shared";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import { useCallback, useState } from "react";
import { InclusionStrategy } from "zwave-js";
import { Center } from "../components/Center.js";
import { useDialogs } from "../hooks/useDialogs.js";
import { useControllerEvent, useDriver } from "../hooks/useDriver.js";
import { CLIPage, useNavigation } from "../hooks/useNavigation.js";

export interface IncludeNodePageProps {}

enum IncludeNodeStep {
	SelectStrategy,
	PushDaButton,
}

const inclusionStrategies = [
	{
		label: "Default",
		value: InclusionStrategy.Default,
	},
	{
		label: "Security S0 (legacy)",
		value: InclusionStrategy.Security_S0,
	},
	{
		label: "No Encryption",
		value: InclusionStrategy.Insecure,
	},
];

// We need to split this into two components, else querying the DSK will
// reset the local state because the component gets unmounted

export const IncludeNodePage: React.FC<IncludeNodePageProps> = () => {
	const { driver } = useDriver();
	const { navigate } = useNavigation();
	const { showError, queryInput } = useDialogs();

	const [step, setStep] = useState(IncludeNodeStep.SelectStrategy);

	useInput(async (input, key) => {
		if (key.escape) {
			await driver.controller.stopInclusion();
			navigate(CLIPage.DeviceOverview);
		}
	});

	useControllerEvent("inclusion failed", () => {
		showError("Inclusion failed!");
		navigate(CLIPage.DeviceOverview);
	});

	useControllerEvent("node found", (node) => {
		navigate(CLIPage.BootstrappingNode, { nodeId: node.id });
	});

	const selectStrategy = useCallback(
		async (strategy: typeof inclusionStrategies[number]) => {
			setStep(IncludeNodeStep.PushDaButton);
			try {
				const result = await driver.controller.beginInclusion({
					strategy: strategy.value as any,
					userCallbacks: {
						async grantSecurityClasses(requested) {
							// TODO: Ask user
							return requested;
						},
						async validateDSKAndEnterPIN(dsk) {
							const pin = await queryInput(
								`Please enter S2 PIN and verify DSK: _____${dsk}`,
							);
							return pin || false;
						},
						async abort() {
							navigate(CLIPage.DeviceOverview);
						},
					},
				});
				if (result) {
					setStep(IncludeNodeStep.PushDaButton);
				} else {
					showError("Failed to start inclusion!");
					navigate(CLIPage.DeviceOverview);
				}
			} catch (e) {
				showError(`Failed to start inclusion: ${getErrorMessage(e)}`);
				navigate(CLIPage.DeviceOverview);
			}
		},
		[driver.controller],
	);

	switch (step) {
		case IncludeNodeStep.SelectStrategy:
			return (
				<Center>
					<Box flexDirection="column">
						<Text>Select the inclusion strategy:</Text>
						<SelectInput
							items={inclusionStrategies}
							onSelect={selectStrategy}
						/>
						<Text dimColor>
							Press <Text bold>ESCAPE</Text> to cancel.
						</Text>
					</Box>
				</Center>
			);

		case IncludeNodeStep.PushDaButton:
			return (
				<Center>
					<Text>
						<Text color="green">
							<Spinner type="dots" />
						</Text>{" "}
						Inclusion started, push the button on the device to
						include it.
					</Text>
					<Text dimColor>
						Press <Text bold>ESCAPE</Text> to cancel.
					</Text>
				</Center>
			);
	}

	return <Text>We shouldn't be here!</Text>;
};
