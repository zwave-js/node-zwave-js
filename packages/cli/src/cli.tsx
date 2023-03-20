import { getErrorMessage } from "@zwave-js/shared";
import { Box, Line, render, Spacer, Text, useInput } from "ink";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Driver } from "zwave-js";
import { Frame } from "./components/Frame.js";
import { Log } from "./components/Log.js";
import {
	InlineQuery,
	ModalMessage,
	ModalQuery,
	ModalState,
} from "./components/Modals.js";
import { SetUSBPath } from "./components/setUSBPath.js";
import { DialogsContext } from "./hooks/useDialogs.js";
import { DriverContext } from "./hooks/useDriver.js";
import { GlobalsContext } from "./hooks/useGlobals.js";
import { MenuContext, useMenuItemSlots } from "./hooks/useMenu.js";
import {
	CLIPage,
	CLIPageWithProps,
	getPageComponent,
	NavigationContext,
} from "./hooks/useNavigation.js";
import { useStdoutDimensions } from "./hooks/useStdoutDimensions.js";
import { debounce } from "./lib/debounce.js";
import { createLogTransport, LinesBuffer } from "./lib/logging.js";
import { createRunScriptMenuItem, defaultMenuItems } from "./lib/menu.js";

process.on("unhandledRejection", (err) => {
	throw err;
});

// We may have more than 10 input listeners active at any given time
process.stdin.setMaxListeners(100);

const MIN_ROWS = 30;

const logBuffer = new LinesBuffer(10000);
const logTransport = createLogTransport(logBuffer.stream);
const clearLog = () => logBuffer.clear();

const autostart = process.argv.includes("--start");

const CLI: React.FC = () => {
	const [columns, rows] = useStdoutDimensions();

	// Switch between horizontal and vertical layout
	const [layout, setLayout] = useState<"horizontal" | "vertical">(
		columns >= 180 ? "horizontal" : "vertical",
	);
	useEffect(() => {
		setLayout(columns >= 180 ? "horizontal" : "vertical");
	}, [columns, setLayout]);

	const [usbPath, setUSBPath] = useState<string>("/dev/ttyUSB0");

	// We cannot use setState here, because this can cause driver to be undefined when the component is re-mounted
	const driver = useRef<Driver>();
	const setDriver = useCallback((d: Driver) => {
		driver.current = d;
	}, []);

	const [logVisible, setLogVisible] = useState<boolean>(false);
	const setLogVisibleDebounced = useCallback(debounce(setLogVisible, 50), [
		setLogVisible,
	]);

	const [cliPage, setCLIPage] = useState<CLIPageWithProps>({
		page: usbPath && autostart ? CLIPage.StartingDriver : CLIPage.Prepare,
		props: {},
	});
	const [prevCliPage, setPrevCLIPage] = useState<CLIPageWithProps>();

	const navigate = useCallback(
		(to: CLIPage, pageProps?: {}) => {
			setPrevCLIPage(cliPage);
			setCLIPage({ page: to, props: pageProps });
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

	const [modalState, setModalState] = useState<ModalState>();
	const showMessage = useCallback(
		(message: React.ReactNode, color: ModalState["color"]) => {
			return new Promise<void>((resolve) => {
				setModalState({
					type: "message",
					message,
					color,
					onSubmit: () => {
						setModalState(undefined);
						resolve();
					},
				});
			});
		},
		[setModalState],
	);

	const showError = useCallback(
		(message: React.ReactNode) => showMessage(message, "red"),
		[showMessage],
	);
	const showWarning = useCallback(
		(message: React.ReactNode) => showMessage(message, "yellow"),
		[showMessage],
	);
	const showSuccess = useCallback(
		(message: React.ReactNode) => showMessage(message, "green"),
		[showMessage],
	);
	const queryInput = useCallback(
		(
			message: React.ReactNode,
			options: {
				initial?: string;
				inline?: boolean;
			} = {},
		) => {
			const { initial, inline = false } = options;
			return new Promise<any>((resolve) => {
				setModalState({
					type: inline ? "queryInline" : "query",
					message,
					initial,
					onSubmit: (value) => {
						setModalState(undefined);
						resolve(value);
					},
					onCancel: () => {
						setModalState(undefined);
						resolve(undefined);
					},
				});
			});
		},
		[setModalState],
	);

	const runScript = async () => {
		const path = await queryInput("Script path");
		if (!path) return;

		let script: any;
		try {
			script = await import(`${path}?t=${Date.now()}`);
		} catch {
			showError(`Could not load script ${path}`);
			return;
		}

		if (typeof script.default !== "function") {
			showError(
				`Script ${path} must export a function using "export default"`,
			);
			return;
		}

		try {
			await script.default({
				driver: driver.current!,
				showSuccess,
				showWarning,
				showError,
			});
			showSuccess("Script executed successfully!");
		} catch (e) {
			showError(
				`Error during script execution: ${getErrorMessage(e, false)}`,
			);
			return;
		}
	};

	const [menuItemSlots, updateMenuItems] = useMenuItemSlots([
		...defaultMenuItems,
		createRunScriptMenuItem(runScript),
	]);
	const menuVisible = !modalState || modalState.type === "queryInline";

	// Prevent the app from exiting automatically
	useInput(() => {
		// nothing to do
	});

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

	const PageComponent = getPageComponent(cliPage.page);

	return (
		<MenuContext.Provider value={{ updateItems: updateMenuItems }}>
			<GlobalsContext.Provider
				value={{
					usbPath,
					logTransport,
					logVisible,
					setLogVisible: setLogVisibleDebounced,
					clearLog,
				}}
			>
				<NavigationContext.Provider
					value={{
						currentPage: cliPage.page,
						previousPage: prevCliPage?.page,
						navigate,
						back,
					}}
				>
					<DriverContext.Provider
						value={{
							driver: driver.current!,
							setDriver,
						}}
					>
						<DialogsContext.Provider
							value={{
								showError,
								showWarning,
								showSuccess,
								queryInput,
							}}
						>
							<Frame
								topLabels={menuVisible && menuItemSlots.top}
								bottomLabels={
									menuVisible && menuItemSlots.bottom
								}
								height={
									rows -
									(process.env.NODE_ENV === "development"
										? layout === "horizontal"
											? 4
											: 10
										: 0)
								}
								width={columns}
								paddingY={1}
								flexDirection={
									layout === "horizontal" ? "row" : "column"
								}
								alignItems="stretch"
								justifyContent="space-between"
							>
								{(!modalState ||
									modalState.type === "queryInline") && (
									<>
										<Box
											flexDirection="column"
											flexGrow={1}
											alignItems="stretch"
											// justifyContent="center"
										>
											{/* TODO: This should be merged into `selectPage` */}
											{cliPage.page ===
												CLIPage.SetUSBPath && (
												<SetUSBPath
													path={usbPath}
													onCancel={() =>
														setCLIPage({
															page: CLIPage.Prepare,
														})
													}
													onSubmit={(path) => {
														setUSBPath(path);
														setCLIPage({
															page: CLIPage.Prepare,
														});
													}}
												/>
											)}

											{PageComponent && (
												<PageComponent
													{...cliPage.props}
												/>
											)}

											{modalState?.type ===
												"queryInline" && (
												<>
													<Spacer />
													<InlineQuery
														onSubmit={
															modalState.onSubmit
														}
														onCancel={
															modalState.onCancel
														}
														initial={
															modalState.initial
														}
														color={modalState.color}
													>
														{modalState.message}
													</InlineQuery>
												</>
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
																	rows / 2,
																),
																30,
														  )
												}
											>
												<Line
													orientation={
														layout === "horizontal"
															? "vertical"
															: "horizontal"
													}
													borderColor="gray"
													borderStyle="single"
												/>

												<Log buffer={logBuffer} />
											</Box>
										)}
									</>
								)}
								{modalState && (
									<>
										{modalState.type === "message" && (
											<ModalMessage
												onSubmit={modalState.onSubmit}
												color={modalState.color}
											>
												{modalState.message}
											</ModalMessage>
										)}
										{modalState.type === "query" && (
											<ModalQuery
												onSubmit={modalState.onSubmit}
												onCancel={modalState.onCancel}
												initial={modalState.initial}
												color={modalState.color}
											>
												{modalState.message}
											</ModalQuery>
										)}
									</>
								)}
							</Frame>
						</DialogsContext.Provider>
					</DriverContext.Provider>
				</NavigationContext.Provider>
			</GlobalsContext.Provider>
		</MenuContext.Provider>
	);
};

render(<CLI />);
