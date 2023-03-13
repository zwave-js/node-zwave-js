import { AllColumnProps, CellProps, Table } from "@alcalzone/ink-table";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useEffect, useState } from "react";
import {
	DeviceClass,
	getEnumMemberName,
	InterviewStage,
	NodeStatus,
	ZWaveNode,
} from "zwave-js";
import { CommandPalette } from "../components/CommandPalette.js";
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

const okText = "✓";
const nokText = "✗";

const statusTexts = {
	Unknown: ["?", "gray"],
	Alive: [okText, "greenBright"],
	Dead: [nokText, "red"],
	Awake: ["awake", "blueBright"],
	Asleep: ["asleep", "yellow"],
} as const;

const interviewTexts = {
	None: ["█⬝⬝⬝", "gray"],
	ProtocolInfo: ["██⬝⬝", "gray"],
	NodeInfo: ["███⬝", "gray"],
	CommandClasses: ["████", "gray"],
	Complete: [okText, "green"],
};

const unknownText = "(unknown)";

const Cell: ((props: CellProps) => JSX.Element) | undefined = ({
	children,
	column,
}) => {
	if (
		column === 1 /* model */ &&
		typeof children === "string" &&
		children.trim() === unknownText
	) {
		return <Text color="gray">{children}</Text>;
	} else if (
		column === 3 /* ready */ &&
		typeof children === "string" &&
		children.trim().length === 1
	) {
		const trimmed = children.trim();
		return (
			<Text bold color={trimmed === okText ? "green" : "red"}>
				{children}
			</Text>
		);
	} else if (
		column === 4 /* status */ &&
		typeof children === "string" &&
		children.trim().length === 1
	) {
		const originalLength = children.length;
		const trimmed = children.trim();
		const status =
			statusTexts[NodeStatus[trimmed as any] as keyof typeof statusTexts];
		if (status) {
			const newLength = status[0].length;
			const padL = " ".repeat(
				Math.floor((originalLength - newLength) / 2),
			);
			const padR = " ".repeat(originalLength - newLength - padL.length);
			return (
				<Text bold color={status[1]}>
					{padL}
					{status[0]}
					{padR}
				</Text>
			);
		}
	} else if (
		column === 5 /* Interview Stage */ &&
		typeof children === "string" &&
		children.trim().length === 1
	) {
		const originalLength = children.length;
		const trimmed = children.trim();
		const stage: InterviewStage = parseInt(trimmed) as any;
		const text =
			interviewTexts[
				getEnumMemberName(
					InterviewStage,
					stage,
				) as keyof typeof interviewTexts
			];
		if (text) {
			const newLength =
				text[0].length + (stage < InterviewStage.Complete ? 2 : 0);
			const padL = " ".repeat(
				Math.floor((originalLength - newLength) / 2),
			);
			const padR = " ".repeat(originalLength - newLength - padL.length);
			return (
				<>
					<Text>{padL}</Text>
					{stage < InterviewStage.Complete && (
						<Text color="greenBright">
							<Spinner type="dots" />{" "}
						</Text>
					)}
					<Text
						bold={stage === InterviewStage.Complete}
						color={text?.[1]}
					>
						{text?.[0]}
						{padR}
					</Text>
				</>
			);
		}
	}

	return <Text>{children}</Text>;
};

function getDeviceType(cls: DeviceClass | undefined): string {
	if (!cls) return "unknown";

	const deviceType = cls.specific.zwavePlusDeviceType;
	if (deviceType) return deviceType;

	const hasSpecificDeviceClass = cls.specific.key !== 0;
	if (hasSpecificDeviceClass) return cls.specific.label;
	return cls.generic.label;
}

function getCustomName(node: ZWaveNode): string | undefined {
	return [node.name, node.location && `(${node.location})`]
		.filter((x) => !!x)
		.join(" ");
}

function getModel(node: ZWaveNode): string {
	const mfg = node.deviceConfig?.manufacturer;
	const model = node.label;
	const desc = node.deviceConfig?.description;
	return [mfg, model, desc].filter((x) => !!x).join(" ");
}

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

	const nodesData = nodes.map((node) => ({
		"#": node.id,
		Model: getCustomName(node) || getModel(node) || unknownText,
		Type: getDeviceType(node.deviceClass),
		Ready: node.ready ? "✓" : "✗",
		Status: node.status,
		Interview: node.interviewStage,
	}));

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

	const columns: AllColumnProps<typeof nodesData[number]>[] = [
		{ key: "#", align: "right" },
		{ key: "Model" },
		{ key: "Type", align: "center" },
		{ key: "Ready", align: "center" },
		{ key: "Status", align: "center" },
		{ key: "Interview", align: "center" },
	];

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
					{
						label: "Re-Interview",
						hotkey: "i",
						onPress: async () => {
							const nodeId = await queryInput(
								"Re-Interview → Node ID",
								{ inline: true },
							);
							if (!nodeId) return;
							const nodeIdNum = parseInt(nodeId, 10);
							if (
								!Number.isNaN(nodeIdNum) &&
								nodeIDs.includes(nodeIdNum)
							) {
								driver.controller.nodes
									.get(nodeIdNum)
									?.refreshInfo()
									.catch(() => {});
							} else {
								showError("Node not found");
							}
						},
					},
				]}
			></CommandPalette>

			<Table data={nodesData} cell={Cell} columns={columns} />

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
