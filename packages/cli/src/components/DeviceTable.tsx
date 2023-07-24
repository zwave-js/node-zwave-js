import { AllColumnProps, CellProps, Table } from "@alcalzone/ink-table";
import { InterviewStage, NodeStatus } from "@zwave-js/core/safe";
import { Text } from "ink";
import Spinner from "ink-spinner";
import { DeviceClass, getEnumMemberName, ZWaveNode } from "zwave-js";

interface DeviceTableRow {
	"#": number;
	Model: string;
	Type: string;
	Ready: string;
	Status: NodeStatus;
	Interview: InterviewStage;
}

export interface DeviceTableProps {
	devices: ZWaveNode[];
}

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

export const DeviceTable: React.FC<DeviceTableProps> = (props) => {
	const columns: AllColumnProps<DeviceTableRow>[] = [
		{ key: "#", align: "right" },
		{ key: "Model" },
		{ key: "Type", align: "center" },
		{ key: "Ready", align: "center" },
		{ key: "Status", align: "center" },
		{ key: "Interview", align: "center" },
	];

	const data = props.devices.map((node) => ({
		"#": node.id,
		Model: getCustomName(node) || getModel(node) || unknownText,
		Type: getDeviceType(node.deviceClass),
		Ready: node.ready ? "✓" : "✗",
		Status: node.status,
		Interview: node.interviewStage,
	}));

	return <Table data={data} cell={Cell} columns={columns} />;
};
