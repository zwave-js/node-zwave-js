import { Box, render, Text, useApp } from "ink";
import useStdoutDimensions from "ink-use-stdout-dimensions";
import { useState } from "react";
import { Driver, libVersion } from "zwave-js";
import { ConfirmExit } from "./components/confirmExit";
import { Frame } from "./components/Frame";
import { HotkeyLabel } from "./components/HotkeyLabel";
import { Logo } from "./components/Logo";
import { SetUSBPath } from "./components/setUSBPath";

enum CLIPage {
	Idle,
	SetUSBPath,
	StartingDriver,
	ConfirmExit,
}

const CLI: React.FC = () => {
	const { exit } = useApp();
	const [columns, rows] = useStdoutDimensions();

	const [cliPage, setCLIPage] = useState<CLIPage>(CLIPage.Idle);
	const [usbPath, setUSBPath] = useState<string>();
	const [driver, setDriver] = useState<Driver>();

	const bottomMenu =
		cliPage === CLIPage.Idle
			? {
					left: [
						!!usbPath && (
							<HotkeyLabel
								hotkey="s"
								label="start"
								onPress={() => {
									setCLIPage(CLIPage.StartingDriver);
								}}
							/>
						),
					],
					right: [
						<HotkeyLabel
							hotkey="o"
							label="options"
							onPress={() => {
								setCLIPage(CLIPage.SetUSBPath);
							}}
						/>,

						<HotkeyLabel
							hotkey="x"
							label="exit"
							color="red"
							onPress={() => setCLIPage(CLIPage.ConfirmExit)}
						/>,
					],
			  }
			: undefined;

	return (
		<Frame
			topLabels={{
				left: [
					"Z-Wave JS",
					!!driver && (
						<Text bold={false} dimColor>
							v{libVersion}
						</Text>
					),
				],
				right: [
					<Text bold={false} dimColor>
						USB Path: {usbPath || "(none)"}
					</Text>,
				],
			}}
			bottomLabels={bottomMenu}
			height={Math.min(30, rows)}
			paddingY={1}
			justifyContent="center"
		>
			{cliPage === CLIPage.Idle && (
				<Box
					alignSelf="center"
					flexDirection="column"
					alignItems="center"
				>
					<Logo />
					<Text> </Text>
					<Text>
						Select a USB path in the options, then start the driver.
					</Text>
				</Box>
			)}

			{cliPage === CLIPage.SetUSBPath && (
				<SetUSBPath
					path={usbPath}
					onCancel={() => setCLIPage(CLIPage.Idle)}
					onSubmit={(path) => {
						setUSBPath(path);
						setCLIPage(CLIPage.Idle);
					}}
				/>
			)}

			{cliPage === CLIPage.ConfirmExit && (
				<ConfirmExit
					onCancel={() => setCLIPage(CLIPage.Idle)}
					onExit={exit}
				/>
			)}
		</Frame>
	);
};

// console.clear();
render(<CLI />);
//
