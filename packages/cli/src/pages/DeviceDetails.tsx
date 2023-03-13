import { Box, Text } from "ink";
import { useEffect } from "react";
import type { ZWaveNode } from "zwave-js";
import { CommandPalette } from "../components/CommandPalette.js";
import { DeviceTable } from "../components/DeviceTable.js";
import { HotkeyLabel } from "../components/HotkeyLabel.js";
import { useDialogs } from "../hooks/useDialogs.js";
import { useForceRerender } from "../hooks/useForceRerender.js";
import { useMenu, type MenuItem } from "../hooks/useMenu.js";
import { CLIPage, useNavigation } from "../hooks/useNavigation.js";
import { useZWaveNode } from "../hooks/useZWaveNode.js";
import {
	destroyDriverMenuItem,
	exitMenuItem,
	toggleLogMenuItem,
} from "../lib/menu.js";

export interface DeviceDetailsPageProps {
	nodeId: number;
}

export const DeviceDetailsPage: React.FC<DeviceDetailsPageProps> = (props) => {
	const { navigate } = useNavigation();
	const { showSuccess, showError } = useDialogs();
	const forceRerender = useForceRerender();

	const deviceMenuItem: MenuItem = {
		location: "bottomLeft",
		item: (
			<HotkeyLabel
				hotkey="escape"
				label="Overview"
				onPress={() => navigate(CLIPage.DeviceOverview)}
			/>
		),
	};

	useMenu([
		deviceMenuItem,
		toggleLogMenuItem,
		destroyDriverMenuItem,
		exitMenuItem,
	]);

	const node = useZWaveNode(props.nodeId);
	// Redirect to the overview when the node is not found
	useEffect(() => {
		if (!node) navigate(CLIPage.DeviceOverview);
	}, [node, navigate]);

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

	if (!node) return <></>;
	return (
		<Box flexDirection="column">
			<CommandPalette
				label={
					<Text color="blueBright" bold>
						Actions
					</Text>
				}
				commands={[
					!node.isControllerNode && {
						label: "Ping",
						hotkey: "p",
						onPress: async () => {
							const result = await node.ping();
							if (result) {
								showSuccess("Ping succeeded");
							} else {
								showError("Ping failed");
							}
						},
					},
					!node.isControllerNode && {
						label: "Re-Interview",
						hotkey: "i",
						onPress: () => {
							void node.refreshInfo().catch(() => {});
						},
					},
				]}
			></CommandPalette>

			<DeviceTable devices={[node]} />
		</Box>
	);
};
