import { Box, Text } from "ink";
import Table from "ink-table";
import type { PropsWithChildren } from "react";
import { CommandPalette } from "../components/CommandPalette";
import { useDriver } from "../hooks/useDriver";
import { useMenu } from "../hooks/useMenu";

const okText = "✓";
const nokText = "✗";

const Cell: React.FC<PropsWithChildren<{ column: number }>> = ({
	children,
	column,
}) => {
	if (
		column === 3 /* ready */ &&
		typeof children === "string" &&
		children.length === 1
	) {
		return (
			<Text color={children === okText ? "green" : "red"}>
				{children}
			</Text>
		);
	} else {
		return <Text>{children}</Text>;
	}
};

export const DevicesPage: React.FC = () => {
	useMenu([
		{
			location: "topCenter",
			item: "Devices",
		},
	]);

	const { driver } = useDriver();
	const nodes = [...driver.controller.nodes.values()];
	const nodesData = nodes.map((node) => ({
		"#": node.id,
		Model: node.label + " " + node.deviceConfig?.description ?? "",
		Type: node.deviceClass?.specific.label,
		Rdy: node.ready ? "✓" : "✗",
	}));

	return (
		<Box flexDirection="column">
			<CommandPalette
				commands={[
					{ label: "Add", hotkey: "+" },
					{ label: "Remove", hotkey: "-" },
				]}
			></CommandPalette>

			{/* @ts-expect-error cell type is wrong */}
			<Table data={nodesData} cell={Cell} />
		</Box>
	);
};
