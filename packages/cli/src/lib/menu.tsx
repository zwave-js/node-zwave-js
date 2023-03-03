import { Text } from "ink";
import { libVersion } from "zwave-js";
import { HotkeyLabel } from "../components/HotkeyLabel.js";
import { USBPathInfo } from "../components/USBPathInfo.js";
import { useDriver } from "../hooks/useDriver.js";
import { useGlobals } from "../hooks/useGlobals.js";
import type { MenuItem } from "../hooks/useMenu.js";
import { CLIPage, useNavigation } from "../hooks/useNavigation.js";

const ToggleLogMenuItem: React.FC = () => {
	const { logVisible, setLogVisible } = useGlobals();
	return (
		<HotkeyLabel
			hotkey="l"
			label={logVisible ? "hide log" : "show log"}
			color={logVisible ? "red" : "green"}
			onPress={() => {
				setLogVisible((e) => !e);
			}}
		/>
	);
};

export const toggleLogMenuItem: MenuItem = {
	location: "bottomCenter",
	item: <ToggleLogMenuItem />,
};

// =====================================================================

const ExitMenuItem: React.FC = () => {
	const { navigate } = useNavigation();

	return (
		<HotkeyLabel
			hotkey="x"
			modifiers={["ctrl"]}
			label="exit"
			onPress={() => navigate(CLIPage.ConfirmExit)}
		/>
	);
};

export const exitMenuItem: MenuItem = {
	location: "bottomRight",
	item: <ExitMenuItem />,
	// always put this at the end
	compareTo: () => 1,
};

// =====================================================================

const DestroyDriverMenuItem: React.FC = () => {
	const { navigate } = useNavigation();
	const { driver, destroyDriver } = useDriver();

	return (
		<HotkeyLabel
			hotkey="y"
			label="destroy driver"
			onPress={async () => {
				await destroyDriver();
				navigate(CLIPage.Prepare);
			}}
		/>
	);
};

export const destroyDriverMenuItem: MenuItem = {
	location: "bottomRight",
	item: <DestroyDriverMenuItem />,
};

// =====================================================================

export const defaultMenuItems: MenuItem[] = [
	{
		location: "topLeft",
		item: "Z-Wave JS",
	},
	{
		location: "topLeft",
		item: (
			<Text bold={false} dimColor>
				v{libVersion}
			</Text>
		),
	},
	{
		location: "topLeft",
		item: <USBPathInfo />,
	},
];
