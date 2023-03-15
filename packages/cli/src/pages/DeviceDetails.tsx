import { useEffect } from "react";
import { DeviceDetailsController } from "../components/DeviceDetailsController.js";
import { DeviceDetailsEndNode } from "../components/DeviceDetailsEndNode.js";
import { HotkeyLabel } from "../components/HotkeyLabel.js";
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

	if (!node) return <></>;
	if (node.isControllerNode) return <DeviceDetailsController node={node} />;
	return <DeviceDetailsEndNode node={node} />;
};
