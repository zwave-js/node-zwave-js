import { Text } from "ink";
import { libVersion } from "zwave-js";
import { HotkeyLabel } from "../components/HotkeyLabel";
import { USBPathInfo } from "../components/USBPathInfo";
import { useGlobals } from "../hooks/useGlobals";
import type { MenuItem } from "../hooks/useMenu";
import { CLIPage, useNavigation } from "../hooks/useNavigation";

const ToggleLogMenuItem: React.FC = () => {
	const { logEnabled, setLogEnabled } = useGlobals();
	return (
		<HotkeyLabel
			hotkey="l"
			label={logEnabled ? "hide log" : "show log"}
			color={logEnabled ? "red" : "green"}
			onPress={() => {
				setLogEnabled((e) => !e);
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
	const [navigate] = useNavigation();

	return (
		<HotkeyLabel
			hotkey="x"
			label="exit"
			color="red"
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
		location: "topRight",
		item: <USBPathInfo />,
	},
	exitMenuItem,
];
