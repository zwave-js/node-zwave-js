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

export interface ReplaceFailedNodePageProps {
	nodeId: number;
}

enum ReplaceFailedNodeStep {
	SelectStrategy,
	Replacing,
	PushDaButton,
}

const replaceStrategies = [
	{
		label: "Security S2",
		value: InclusionStrategy.Security_S2,
	},
	{
		label: "Security S0",
		value: InclusionStrategy.Security_S0,
	},
	{
		label: "No Encryption",
		value: InclusionStrategy.Insecure,
	},
];

// We need to split this into two components, else querying the DSK will
// reset the local state because the component gets unmounted

export const ReplaceFailedNodePage: React.FC<ReplaceFailedNodePageProps> = (
	props,
) => {
	const { driver } = useDriver();
	const { navigate } = useNavigation();
	const { showError, queryInput } = useDialogs();

	const [step, setStep] = useState(ReplaceFailedNodeStep.SelectStrategy);

	useInput(async (input, key) => {
		if (key.escape) {
			if (step === ReplaceFailedNodeStep.Replacing) {
				// Too late
				return;
			}
			if (step === ReplaceFailedNodeStep.PushDaButton) {
				await driver.controller.stopInclusion();
			}
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
		async (strategy: typeof replaceStrategies[number]) => {
			setStep(ReplaceFailedNodeStep.Replacing);
			try {
				const result = await driver.controller.replaceFailedNode(
					props.nodeId,
					{
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
					},
				);
				if (result) {
					setStep(ReplaceFailedNodeStep.PushDaButton);
				} else {
					showError(
						"Could not replace node - the controller is busy!",
					);
					navigate(CLIPage.DeviceOverview);
				}
			} catch (e) {
				showError(
					`Failed to replace node ${props.nodeId}: ${getErrorMessage(
						e,
					)}`,
				);
				navigate(CLIPage.DeviceOverview);
			}
		},
		[driver.controller],
	);

	switch (step) {
		case ReplaceFailedNodeStep.SelectStrategy:
			return (
				<Center>
					<Box flexDirection="column">
						<Text>Select how to include the replacement node:</Text>
						<SelectInput
							items={replaceStrategies}
							onSelect={selectStrategy}
						/>
						<Text dimColor>
							Press <Text bold>ESCAPE</Text> to cancel.
						</Text>
					</Box>
				</Center>
			);

		case ReplaceFailedNodeStep.Replacing:
			return (
				<Center>
					<Text>
						<Text color="red">
							<Spinner type="dots" />
						</Text>{" "}
						The node is being replaced, please wait...
					</Text>
				</Center>
			);

		case ReplaceFailedNodeStep.PushDaButton:
			return (
				<Center>
					<Text>
						<Text color="green">
							<Spinner type="dots" />
						</Text>{" "}
						Ready to include the new device, push the button on the
						device to include it.
					</Text>
					<Text dimColor>
						Press <Text bold>ESCAPE</Text> to cancel.
					</Text>
				</Center>
			);
	}

	return <Text>We shouldn't be here!</Text>;
};
