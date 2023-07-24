import { Box, Text } from "ink";
import { useState } from "react";
import { HotkeyLabel } from "../components/HotkeyLabel.js";
import { Logo } from "../components/Logo.js";
import { useGlobals } from "../hooks/useGlobals.js";
import { useMenu } from "../hooks/useMenu.js";
import { CLIPage, useNavigation } from "../hooks/useNavigation.js";
import { exitMenuItem, toggleLogMenuItem } from "../lib/menu.js";

export interface PreparePageProps {
	// TODO:
}

export const PreparePage: React.FC<PreparePageProps> = (props) => {
	const { usbPath } = useGlobals();
	const { navigate } = useNavigation();

	const [visible, setVisible] = useState(false);

	// const startDriverMenuItem: MenuItem = {
	// 	location: "bottomLeft",
	// 	item: (
	// 		<HotkeyLabel
	// 			hotkey="s"
	// 			label="start"
	// 			onPress={() => {
	// 				navigate(CLIPage.StartingDriver);
	// 			}}
	// 		/>
	// 	),
	// 	visible: !!usbPath,
	// };

	useMenu([
		// startDriverMenuItem,
		toggleLogMenuItem,
		{
			location: "bottomRight",
			item: (
				<HotkeyLabel
					hotkey="o"
					label="options"
					onPress={() => {
						navigate(CLIPage.SetUSBPath);
					}}
				/>
			),
		},
		exitMenuItem,
	]);

	return (
		<Box alignSelf="center" flexDirection="column" alignItems="center">
			<Logo />
			<Text> </Text>
			{usbPath ? (
				<Text>
					<Text dimColor>Ready to </Text>
					<HotkeyLabel
						hotkey="s"
						label="START"
						color="green"
						onPress={() => {
							navigate(CLIPage.StartingDriver);
						}}
					/>
					<Text dimColor> the driver.</Text>
				</Text>
			) : (
				<Text>
					Select a USB path in the options, then start the driver.
				</Text>
			)}
		</Box>
	);
};
