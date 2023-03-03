import { Box, render, Text, useInput } from "ink";
import useStdoutDimensions from "ink-use-stdout-dimensions";
import { useCallback, useEffect, useState } from "react";
import type { Driver } from "zwave-js";
import { Frame } from "./components/Frame";
import { HDivider } from "./components/HDivider";
import { Log } from "./components/Log";
import { ModalMessage, ModalMessageState } from "./components/ModalMessage";
import { SetUSBPath } from "./components/setUSBPath";
import { StartingDriverPage } from "./components/StartingDriver";
import { VDivider } from "./components/VDivider";
import { ActionsContext } from "./hooks/useActions";
import { DialogsContext } from "./hooks/useDialogs";
import { DriverContext } from "./hooks/useDriver";
import { GlobalsContext } from "./hooks/useGlobals";
import { MenuContext, useMenuItemSlots } from "./hooks/useMenu";
import { CLIPage, NavigationContext } from "./hooks/useNavigation";
import { createLogTransport, LinesBuffer } from "./lib/logging";
import { defaultMenuItems } from "./lib/menu";
import { ConfirmExitPage } from "./pages/ConfirmExit";
import { MainMenuPage } from "./pages/MainMenu";
import { PreparePage } from "./pages/Prepare";

process.on("unhandledRejection", (err) => {
	throw err;
});

const MIN_ROWS = 30;

const logBuffer = new LinesBuffer(10000);
const logTransport = createLogTransport(logBuffer.stream);

const clearLog = () => logBuffer.clear();

const CLI: React.FC = () => {
	const [columns, rows] = useStdoutDimensions();

	// Switch between horizontal and vertical layout
	const [layout, setLayout] = useState<"horizontal" | "vertical">(
		columns >= 180 ? "horizontal" : "vertical",
	);
	useEffect(() => {
		setLayout(columns >= 180 ? "horizontal" : "vertical");
	}, [columns, setLayout]);

	const [usbPath, setUSBPath] = useState<string>("/dev/ttyACM0");
	const [driver, setDriver] = useState<Driver>();
	const destroyDriver = useCallback(async () => {
		if (driver) {
			await driver.destroy();
		}
	}, [driver]);

	const [logVisible, setLogVisible] = useState<boolean>(false);

	const [cliPage, setCLIPage] = useState<CLIPage>(CLIPage.Prepare);
	const [prevCliPage, setPrevCLIPage] = useState<CLIPage>();

	const navigate = useCallback(
		(to: CLIPage) => {
			setPrevCLIPage(cliPage);
			setCLIPage(to);
		},
		[cliPage, setCLIPage, setPrevCLIPage],
	);

	const back = useCallback(() => {
		if (prevCliPage) {
			setCLIPage(prevCliPage);
			setPrevCLIPage(undefined);
			return true;
		}
		return false;
	}, [prevCliPage, setCLIPage, setPrevCLIPage]);

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
	useInput(() => {
		// nothing to do
	});

	const performAction = useCallback(async () => {
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
				value={{
					usbPath,
					logTransport,
					logVisible,
					setLogVisible,
					clearLog,
				}}
			>
				<NavigationContext.Provider
					value={{
						currentPage: cliPage,
						previousPage: prevCliPage,
						navigate,
						back,
					}}
				>
					<ActionsContext.Provider value={{ do: performAction }}>
						<DriverContext.Provider
							value={{
								driver: driver!,
								setDriver,
								destroyDriver,
							}}
						>
							<DialogsContext.Provider value={{ showError }}>
								<Frame
									topLabels={
										!modalMessage && menuItemSlots.top
									}
									bottomLabels={
										!modalMessage && menuItemSlots.bottom
									}
									height={
										rows -
										(layout === "horizontal" ? 4 : 10)
									}
									width={columns}
									paddingY={1}
									flexDirection={
										layout === "horizontal"
											? "row"
											: "column"
									}
									alignItems="stretch"
									justifyContent="space-around"
								>
									{!modalMessage && (
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
														onSubmit={(path) => {
															setUSBPath(path);
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
													<MainMenuPage />
												)}

												{cliPage ===
													CLIPage.ConfirmExit && (
													<ConfirmExitPage />
												)}
											</Box>
											{logVisible && (
												<Box
													flexDirection={
														layout === "horizontal"
															? "row"
															: "column"
													}
													height={
														layout === "horizontal"
															? undefined
															: Math.min(
																	Math.floor(
																		rows /
																			2,
																	),
																	30,
															  )
													}
												>
													{layout === "horizontal" ? (
														<VDivider color="gray" />
													) : (
														<HDivider color="gray" />
													)}
													<Log buffer={logBuffer} />
												</Box>
											)}
										</>
									)}
									{modalMessage && (
										<ModalMessage
											onContinue={() =>
												setModalMessage(undefined)
											}
											color={modalMessage.color}
										>
											{modalMessage.message}
										</ModalMessage>
									)}
								</Frame>
							</DialogsContext.Provider>
						</DriverContext.Provider>
					</ActionsContext.Provider>
				</NavigationContext.Provider>
			</GlobalsContext.Provider>
		</MenuContext.Provider>
	);
};

render(<CLI />);
