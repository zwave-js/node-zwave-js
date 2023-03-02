import { Box, render, Text, useApp, useInput } from "ink";
import { useCallback, useState } from "react";
import type { Driver } from "zwave-js";
import { ConfirmExit } from "./components/ConfirmExit.js";
import { Frame } from "./components/Frame.js";
import { Log } from "./components/Log.js";
import { MainMenu } from "./components/MainMenu.js";
import { ModalMessage, ModalMessageState } from "./components/ModalMessage.js";
import { SetUSBPath } from "./components/setUSBPath.js";
import { StartingDriverPage } from "./components/StartingDriver.js";
import { VDivider } from "./components/VDivider.js";
import { Layer, ZStack } from "./components/ZStack.js";
import { Action, ActionsContext } from "./hooks/useActions.js";
import { DialogsContext } from "./hooks/useDialogs.js";
import { DriverContext } from "./hooks/useDriver.js";
import { GlobalsContext } from "./hooks/useGlobals.js";
import { MenuContext, useMenuItemSlots } from "./hooks/useMenu.js";
import { CLIPage, NavigationContext } from "./hooks/useNavigation.js";
import { useStdoutDimensions } from "./hooks/useStdoutDimensions.js";
import { createLogTransport, LinesBuffer } from "./lib/logging.js";
import { defaultMenuItems } from "./lib/menu.js";
import { PreparePage } from "./pages/Prepare.js";

process.on("unhandledRejection", (err) => {
	throw err;
});

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

	const [menuItemSlots, updateMenuItems] = useMenuItemSlots(defaultMenuItems);

	// Prevent the app from exiting automatically
	useInput((input, key) => {
		// nothing to do
	});

	const performAction = useCallback(async (action: Action) => {
		// if (action.type === "navigate") {
		// 	setCLIPage(action.to);
		// }
	}, []);

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

	return (
		<MenuContext.Provider value={{ updateItems: updateMenuItems }}>
			<GlobalsContext.Provider
				value={{ usbPath, logTransport, logEnabled, setLogEnabled }}
			>
				<NavigationContext.Provider
					value={{ currentPage: cliPage, navigate: setCLIPage }}
				>
					<ActionsContext.Provider value={{ do: performAction }}>
						<DriverContext.Provider
							value={{ driver: driver!, setDriver }}
						>
							<DialogsContext.Provider value={{ showError }}>
								<ZStack height={rows} width={columns}>
									<Layer>
										<Frame
											topLabels={
												!modalMessage &&
												menuItemSlots.top
											}
											bottomLabels={
												!modalMessage &&
												menuItemSlots.bottom
											}
											height={rows}
											width={columns}
											paddingY={1}
											flexDirection="row"
											alignItems="stretch"
											justifyContent="space-around"
										>
											<>
												<Box
													flexGrow={1}
													justifyContent="center"
												>
													{cliPage ===
														CLIPage.Prepare && (
														<PreparePage />
													)}

													{cliPage ===
														CLIPage.SetUSBPath && (
														<SetUSBPath
															path={usbPath}
															onCancel={() =>
																setCLIPage(
																	CLIPage.Prepare,
																)
															}
															onSubmit={(
																path,
															) => {
																setUSBPath(
																	path,
																);
																setCLIPage(
																	CLIPage.Prepare,
																);
															}}
														/>
													)}

													{cliPage ===
														CLIPage.StartingDriver && (
														<StartingDriverPage />
													)}

													{cliPage ===
														CLIPage.MainMenu && (
														<MainMenu />
													)}

													{cliPage ===
														CLIPage.ConfirmExit && (
														<ConfirmExit
															onCancel={() =>
																setCLIPage(
																	CLIPage.Prepare,
																)
															}
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
														<Log
															buffer={logBuffer}
														/>
													</Box>
												)}
											</>
										</Frame>
									</Layer>
									{modalMessage && (
										<Layer zIndex={100}>
											<ModalMessage
												onContinue={() =>
													setModalMessage(undefined)
												}
												color={modalMessage.color}
											>
												{modalMessage.message}
											</ModalMessage>
										</Layer>
									)}
								</ZStack>
							</DialogsContext.Provider>
						</DriverContext.Provider>
					</ActionsContext.Provider>
				</NavigationContext.Provider>
			</GlobalsContext.Provider>
		</MenuContext.Provider>
	);
};

// console.clear();
const { waitUntilExit } = render(<CLI />);
waitUntilExit().then(() => {
	// console.clear();
});
