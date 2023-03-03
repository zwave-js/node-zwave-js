import { Box, Text } from "ink";
import { CellProps, Table } from "ink-table";
import { CommandPalette } from "../components/CommandPalette.js";
import { useDriver } from "../hooks/useDriver.js";
import { useMenu } from "../hooks/useMenu.js";

const okText = "✓";
const nokText = "✗";

const Cell: ((props: CellProps) => JSX.Element) | undefined = ({
	children,
	column,
}) => {
	if (
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

			<Table data={nodesData} cell={Cell} />
		</Box>
	);
};
