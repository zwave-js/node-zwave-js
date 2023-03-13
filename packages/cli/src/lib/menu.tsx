import { Text } from "ink";
import { libVersion } from "zwave-js";
import { HotkeyLabel } from "../components/HotkeyLabel.js";
import { USBPathInfo } from "../components/USBPathInfo.js";
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

	return (
		<HotkeyLabel
			hotkey="y"
			label="destroy driver"
			onPress={() => navigate(CLIPage.DestroyingDriver)}
		/>
	);
};

export const destroyDriverMenuItem: MenuItem = {
	location: "bottomRight",
	item: <DestroyDriverMenuItem />,
};

// =====================================================================

interface RunScriptMenuItemProps {
	onPress: () => void;
}

const RunScriptMenuItem: React.FC<RunScriptMenuItemProps> = (props) => {
	const { navigate } = useNavigation();

	return (
		<HotkeyLabel
			hotkey="r"
			modifiers={["ctrl"]}
			label="run script"
			onPress={props.onPress}
		/>
	);
};

export function createRunScriptMenuItem(onPress: () => void): MenuItem {
	return {
		location: "topRight",
		item: <RunScriptMenuItem onPress={onPress} />,
	};
}

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
