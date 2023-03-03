import { Box } from "ink";
import { useState } from "react";
import { HotkeyLabel } from "../components/HotkeyLabel.js";
import { MenuItem, useMenu } from "../hooks/useMenu.js";
import {
	destroyDriverMenuItem,
	exitMenuItem,
	toggleLogMenuItem,
} from "../lib/menu.js";
import { DevicesPage } from "./Devices.js";

export interface MainMenuPageProps {
	// TODO:
}

enum MainMenuSubPage {
	// None,
	Devices,
}

export const MainMenuPage: React.FC<MainMenuPageProps> = (props) => {
	const [page, setPage] = useState(MainMenuSubPage.Devices);

	// const backMenuItem: MenuItem = {
	// 	location: "bottomLeft",
	// 	item: (
	// 		<HotkeyLabel
	// 			hotkey="escape"
	// 			label="back"
	// 			onPress={() => {
	// 				setPage(MainMenuSubPage.None);
	// 			}}
	// 		/>
	// 	),
	// };

	const devicesMenuItem: MenuItem = {
		location: "bottomLeft",
		item: (
			<HotkeyLabel
				hotkey="d"
				label="Devices"
				onPress={() => {
					setPage(MainMenuSubPage.Devices);
				}}
			/>
		),
	};

	useMenu([
		page !== MainMenuSubPage.Devices && devicesMenuItem,
		// page !== MainMenuSubPage.Devices && backMenuItem,
		toggleLogMenuItem,
		destroyDriverMenuItem,
		exitMenuItem,
	]);

	return (
		<Box flexGrow={1} flexDirection="column">
			{page === MainMenuSubPage.Devices && <DevicesPage />}
		</Box>
	);
};
