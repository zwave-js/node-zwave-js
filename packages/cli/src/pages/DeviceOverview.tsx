import { Box, Text } from "ink";
import { useEffect, useState } from "react";
import type { ZWaveNode } from "zwave-js";
import { CommandPalette } from "../components/CommandPalette.js";
import { DeviceTable } from "../components/DeviceTable.js";
import { HotkeyLabel } from "../components/HotkeyLabel.js";
import { useDialogs } from "../hooks/useDialogs.js";
import { useDriver } from "../hooks/useDriver.js";
import { useForceRerender } from "../hooks/useForceRerender.js";
import { useMenu } from "../hooks/useMenu.js";
import { CLIPage, useNavigation } from "../hooks/useNavigation.js";
import {
	destroyDriverMenuItem,
	exitMenuItem,
	toggleLogMenuItem,
} from "../lib/menu.js";

export const DeviceOverviewPage: React.FC = () => {
	const { driver } = useDriver();
	const forceRerender = useForceRerender();
	const { queryInput, showError } = useDialogs();
	const { navigate } = useNavigation();

	useMenu([toggleLogMenuItem, destroyDriverMenuItem, exitMenuItem]);

	const [maxRows, setMaxRows] = useState(10);

	const [nodeIDs, setNodeIDs] = useState<number[]>([
		...driver.controller.nodes.keys(),
	]);

	const nodes = nodeIDs
		.map((id) => driver.controller.nodes.get(id))
		.filter<ZWaveNode>((x): x is ZWaveNode => !!x);

	// Register event handlers to update the table
	useEffect(() => {
		const updateIDs = () => {
			setNodeIDs([...driver.controller.nodes.keys()]);
		};

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

		const nodeAdded = (node: ZWaveNode) => {
			updateIDs();
			addNodeEventHandlers(node);
		};
		const nodeRemoved = (node: ZWaveNode) => {
			updateIDs();
			removeNodeEventHandlers(node);
		};
		driver.controller.on("node added", nodeAdded);
		driver.controller.on("node removed", nodeRemoved);
		for (const node of driver.controller.nodes.values()) {
			addNodeEventHandlers(node);
		}

		return () => {
			driver.controller.off("node added", nodeAdded);
			driver.controller.off("node removed", nodeRemoved);
			for (const node of driver.controller.nodes.values()) {
				removeNodeEventHandlers(node);
			}
		};
	}, []);

	return (
		<Box flexDirection="column">
			<CommandPalette
				label={
					<Text color="blueBright" bold>
						Devices
					</Text>
				}
				commands={[
					{
						label: "Select",
						hotkey: "return",
						onPress: async () => {
							const nodeId = await queryInput(
								"Select → Node ID",
								{ inline: true },
							);
							if (!nodeId) return;
							const nodeIdNum = parseInt(nodeId, 10);
							if (
								!Number.isNaN(nodeIdNum) &&
								nodeIDs.includes(nodeIdNum)
							) {
								navigate(CLIPage.DeviceDetails, {
									nodeId: nodeIdNum,
								});
							} else {
								showError("Node not found");
							}
						},
					},
					{
						label: "Include",
						hotkey: "+",
						onPress: () => {
							navigate(CLIPage.IncludeNode);
						},
					},
					{
						label: "Exclude",
						hotkey: "-",
						onPress: () => {
							navigate(CLIPage.ExcludeNode);
						},
					},
					{
						label: "Replace failed",
						hotkey: "r",
						onPress: async () => {
							const nodeId = await queryInput(
								"Replace failed → Node ID",
								{ inline: true },
							);
							if (!nodeId) return;
							const nodeIdNum = parseInt(nodeId, 10);
							if (
								!Number.isNaN(nodeIdNum) &&
								nodeIDs.includes(nodeIdNum)
							) {
								navigate(CLIPage.ReplaceFailedNode, {
									nodeId: nodeIdNum,
								});
							} else {
								showError("Node not found");
							}
						},
					},
					{
						label: "Remove failed",
						hotkey: "f",
						onPress: async () => {
							const nodeId = await queryInput(
								"Remove failed → Node ID",
								{ inline: true },
							);
							if (!nodeId) return;
							const nodeIdNum = parseInt(nodeId, 10);
							if (
								!Number.isNaN(nodeIdNum) &&
								nodeIDs.includes(nodeIdNum)
							) {
								navigate(CLIPage.RemoveFailedNode, {
									nodeId: nodeIdNum,
								});
							} else {
								showError("Node not found");
							}
						},
					},
				]}
			></CommandPalette>

			<DeviceTable devices={nodes} />

			<Box paddingLeft={1}>
				<Text color="gray">
					Total{" "}
					<Text color="white" bold>
						{nodeIDs.length}
					</Text>{" "}
					devices.
				</Text>
				{nodeIDs.length > maxRows && (
					<Text color="gray">
						Use <HotkeyLabel hotkey="downArrow" /> and{" "}
						<HotkeyLabel hotkey="upArrow" /> to scroll.
					</Text>
				)}
			</Box>
		</Box>
	);
};
