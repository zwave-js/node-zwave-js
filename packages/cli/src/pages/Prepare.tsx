import { Box, Text } from "ink";
import { useState } from "react";
import { HotkeyLabel } from "../components/HotkeyLabel";
import { Logo } from "../components/Logo";
import { useGlobals } from "../hooks/useGlobals";
import { MenuItem, useMenu } from "../hooks/useMenu";
import { CLIPage, useNavigation } from "../hooks/useNavigation";
import { toggleLogMenuItem } from "../lib/menu";

export interface PreparePageProps {
	// TODO:
}

export const PreparePage: React.FC<PreparePageProps> = (props) => {
	const { usbPath } = useGlobals();
	const [navigate] = useNavigation();

	const [visible, setVisible] = useState(false);

	const startDriverMenuItem: MenuItem = {
		location: "bottomLeft",
		item: (
			<HotkeyLabel
				hotkey="s"
				label="start"
				onPress={() => {
					navigate(CLIPage.StartingDriver);
				}}
			/>
		),
		visible: !!usbPath,
	};

	useMenu([
		startDriverMenuItem,
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
	]);

	return (
		<Box alignSelf="center" flexDirection="column" alignItems="center">
			<Logo />
			<Text> </Text>
			{usbPath ? (
				<Text>Ready to start the driver.</Text>
			) : (
				<Text>
					Select a USB path in the options, then start the driver.
				</Text>
			)}
		</Box>
	);
};
