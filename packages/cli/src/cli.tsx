import { Box, render, Text, useApp, useInput } from "ink";
import useStdoutDimensions from "ink-use-stdout-dimensions";
import { useCallback, useState } from "react";
import { Driver, libVersion } from "zwave-js";
import { ConfirmExit } from "./components/ConfirmExit";
import { Frame } from "./components/Frame";
import { HotkeyLabel } from "./components/HotkeyLabel";
import { Log } from "./components/Log";
import { Logo } from "./components/Logo";
import { MainMenu } from "./components/MainMenu";
import { ModalMessage, ModalMessageState } from "./components/ModalMessage";
import { SetUSBPath } from "./components/setUSBPath";
import { StartingDriver } from "./components/StartingDriver";
import { VDivider } from "./components/VDivider";
import { startDriver } from "./lib/driver";
import { createLogTransport, LinesBuffer } from "./lib/logging";

process.on("unhandledRejection", (err) => {
	throw err;
});

enum CLIPage {
	Prepare,
	SetUSBPath,
	StartingDriver,
	MainMenu,
	ConfirmExit,
}

const MIN_ROWS = 30;

const logBuffer = new LinesBuffer(10000);
const logTransport = createLogTransport(logBuffer.stream);

const CLI: React.FC = () => {
	const { exit } = useApp();
	const [columns, rows] = useStdoutDimensions();

	const [usbPath, setUSBPath] = useState<string>("/dev/ttyACM0");
	const [driver, setDriver] = useState<Driver>();
	const [logEnabled, setLogEnabled] = useState<boolean>(false);

	const [cliPage, setCLIPage] = useState<CLIPage>(CLIPage.Prepare);
	const [modalMessage, setModalMessage] = useState<ModalMessageState>();
	const showError = useCallback(
		(message: React.ReactNode) => {
			setModalMessage({
				message: message,
				color: "red",
			});
		},
		[setModalMessage],
	);

	// Prevent the app from exiting automatically
	useInput((input, key) => {
		// nothing to do
	});

	const tryStartDriver = useCallback(async () => {
		if (driver || !usbPath) return false;

		setCLIPage(CLIPage.StartingDriver);
		try {
			const driver = await startDriver(usbPath, logTransport);
			setDriver(driver);
			setCLIPage(CLIPage.MainMenu);
			return true;
		} catch (e: any) {
			setCLIPage(CLIPage.Prepare);
			showError(e.message);
			return false;
		}
	}, [driver, usbPath]);

	if (rows < MIN_ROWS) {
		return (
			<Box height={rows} justifyContent="center" alignItems="center">
				<Text>
					Terminal is too small{" "}
					<Text bold color="red">
						{columns}&times;{rows}
					</Text>
					. Please resize it to at least{" "}
					<Text bold color="green">
						{columns}&times;{MIN_ROWS}
					</Text>
					.
				</Text>
			</Box>
		);
	}

	const bottomMenu = modalMessage
		? undefined
		: cliPage === CLIPage.Prepare || cliPage === CLIPage.MainMenu
		? {
				left: [
					cliPage === CLIPage.Prepare && !!usbPath && (
						<HotkeyLabel
							hotkey="s"
							label="start"
							onPress={() => {
								tryStartDriver();
							}}
						/>
					),
				],
				center: [
					<HotkeyLabel
						hotkey="l"
						label={logEnabled ? "hide log" : "show log"}
						color={logEnabled ? "red" : "green"}
						onPress={() => {
							setLogEnabled((e) => !e);
						}}
					/>,
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
					<Text bold={false} dimColor>
						v{libVersion}
					</Text>,
				],
				right: [
					<Text bold={false} dimColor>
						USB Path: {usbPath || "(none)"}
					</Text>,
				],
			}}
			bottomLabels={bottomMenu}
			height={rows}
			paddingY={1}
			// align
			// justifyContent="st"
			flexDirection="row"
			alignItems="stretch"
			justifyContent="space-around"
		>
			{modalMessage ? (
				<ModalMessage
					onContinue={() => setModalMessage(undefined)}
					color={modalMessage.color}
				>
					{modalMessage.message}
				</ModalMessage>
			) : (
				<>
					<Box flexGrow={1} justifyContent="center">
						{cliPage === CLIPage.Prepare && (
							<Box
								alignSelf="center"
								flexDirection="column"
								alignItems="center"
							>
								<Logo />
								<Text> </Text>
								{usbPath ? (
									<Text>Ready to start the driver.</Text>
								) : (
									<Text>
										Select a USB path in the options, then
										start the driver.
									</Text>
								)}
							</Box>
						)}

						{cliPage === CLIPage.SetUSBPath && (
							<SetUSBPath
								path={usbPath}
								onCancel={() => setCLIPage(CLIPage.Prepare)}
								onSubmit={(path) => {
									setUSBPath(path);
									setCLIPage(CLIPage.Prepare);
								}}
							/>
						)}

						{cliPage === CLIPage.StartingDriver && (
							<StartingDriver />
						)}

						{cliPage === CLIPage.MainMenu && <MainMenu />}

						{cliPage === CLIPage.ConfirmExit && (
							<ConfirmExit
								onCancel={() => setCLIPage(CLIPage.Prepare)}
								onExit={async () => {
									if (driver) {
										await driver.destroy();
									}
									exit();
								}}
							/>
						)}
					</Box>
					{logEnabled && (
						<Box>
							<VDivider color="gray" />
							<Log buffer={logBuffer} />
						</Box>
					)}
				</>
			)}
		</Frame>
	);
};

// console.clear();
const { waitUntilExit } = render(<CLI />);
waitUntilExit().then(() => {
	console.clear();
});
