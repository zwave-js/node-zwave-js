import { Box, Text } from "ink";
import { useEffect } from "react";
import type { ZWaveNode } from "zwave-js";
import { useDialogs } from "../hooks/useDialogs.js";
import { useForceRerender } from "../hooks/useForceRerender.js";
import { CLIPage, useNavigation } from "../hooks/useNavigation.js";
import { CommandPalette } from "./CommandPalette.js";
import { DeviceTable } from "./DeviceTable.js";

export interface DeviceDetailsControllerProps {
	node: ZWaveNode;
}

export const DeviceDetailsController: React.FC<
	DeviceDetailsControllerProps
> = ({ node }) => {
	const { showSuccess, showError } = useDialogs();
	const { navigate } = useNavigation();
	const forceRerender = useForceRerender();

	// Register event handlers to update the table
	useEffect(() => {
		const addNodeEventHandlers = (node: ZWaveNode) => {
			node.on("interview started", forceRerender)
				.on("interview completed", forceRerender)
				.on("ready", forceRerender)
				.on("alive", forceRerender)
				.on("dead", forceRerender)
				.on("sleep", forceRerender)
				.on("wake up", forceRerender)
				.on("interview started", forceRerender)
				.on("interview stage completed", forceRerender)
				.on("interview completed", forceRerender);
		};
		const removeNodeEventHandlers = (node: ZWaveNode) => {
			node.off("interview started", forceRerender)
				.off("interview completed", forceRerender)
				.off("ready", forceRerender)
				.off("alive", forceRerender)
				.off("dead", forceRerender)
				.off("sleep", forceRerender)
				.off("wake up", forceRerender)
				.off("interview started", forceRerender)
				.off("interview stage completed", forceRerender)
				.off("interview completed", forceRerender);
		};

		if (node) addNodeEventHandlers(node);

		return () => {
			if (node) removeNodeEventHandlers(node);
		};
	}, [node]);

	return (
		<Box flexDirection="column">
			<CommandPalette
				label={
					<Text color="blueBright" bold>
						Actions
					</Text>
				}
				commands={[
					{
						label: "Change RF region",
						hotkey: "r",
						onPress: () => {
							navigate(CLIPage.ControllerSetRegion);
						},
					},
				]}
			></CommandPalette>

			<DeviceTable devices={[node]} />
		</Box>
	);
};
