import { getErrorMessage } from "@zwave-js/shared";
import { Text, useInput } from "ink";
import Spinner from "ink-spinner";
import { useEffect, useState } from "react";
import { ExclusionStrategy } from "zwave-js";
import { Center } from "../components/Center.js";
import { useDialogs } from "../hooks/useDialogs.js";
import { useControllerEvent, useDriver } from "../hooks/useDriver.js";
import { CLIPage, useNavigation } from "../hooks/useNavigation.js";

export interface ExcludeNodePageProps {}

export const ExcludeNodePage: React.FC<ExcludeNodePageProps> = (props) => {
	const { driver } = useDriver();
	const { navigate } = useNavigation();
	const { showError, showSuccess } = useDialogs();
	const [message, setMessage] = useState("Starting exclusion...");

	useInput(async (input, key) => {
		if (key.escape) {
			await driver.controller.stopExclusion();
			navigate(CLIPage.DeviceOverview);
		}
	});

	useEffect(() => {
		(async () => {
			try {
				const result = await driver.controller.beginExclusion({
					strategy: ExclusionStrategy.DisableProvisioningEntry,
				});
				if (result) {
					setMessage(
						"Exclusion started, push the button on the device to exclude it.",
					);
				} else {
					showError("Failed to start exclusion!");
					navigate(CLIPage.DeviceOverview);
				}
			} catch (e) {
				showError(`Failed to start exclusion: ${getErrorMessage(e)}`);
				navigate(CLIPage.DeviceOverview);
			}
		})();
	}, []);

	// useControllerEvent("exclusion stopped", () => {
	// 	navigate(CLIPage.DeviceOverview);
	// });

	useControllerEvent("exclusion failed", () => {
		showError("Exclusion failed!");
		navigate(CLIPage.DeviceOverview);
	});

	useControllerEvent("node removed", (node) => {
		showSuccess(`Node ${node.id} was removed!`);
		navigate(CLIPage.DeviceOverview);
	});

	return (
		<Center>
			<Text>
				<Text color="red">
					<Spinner type="dots" />
				</Text>{" "}
				{message}
			</Text>
			<Text dimColor>
				Press <Text bold>ESCAPE</Text> to cancel.
			</Text>
		</Center>
	);
};
