import { Box } from "ink";
import { useState } from "react";
import { HotkeyLabel } from "../components/HotkeyLabel";
import { MenuItem, useMenu } from "../hooks/useMenu";
import {
	destroyDriverMenuItem,
	exitMenuItem,
	toggleLogMenuItem,
} from "../lib/menu";
import { DevicesPage } from "./Devices";

export interface MainMenuPageProps {
	// TODO:
}

enum MainMenuSubPage {
	None,
	Devices,
}

export const MainMenuPage: React.FC<MainMenuPageProps> = (props) => {
	const [page, setPage] = useState(MainMenuSubPage.None);

	const backMenuItem: MenuItem = {
		location: "bottomLeft",
		item: (
			<HotkeyLabel
				hotkey="escape"
				label="back"
				onPress={() => {
					setPage(MainMenuSubPage.None);
				}}
			/>
		),
	};

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
		page !== MainMenuSubPage.None && backMenuItem,
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
