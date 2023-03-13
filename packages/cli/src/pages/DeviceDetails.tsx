import { Text } from "ink";
import { HotkeyLabel } from "../components/HotkeyLabel.js";
import { useMenu, type MenuItem } from "../hooks/useMenu.js";
import { CLIPage, useNavigation } from "../hooks/useNavigation.js";
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

	return <Text>{props.nodeId}</Text>;
};
