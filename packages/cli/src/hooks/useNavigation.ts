import React from "react";
import { DestroyingDriverPage } from "../components/DestroyingDriver.js";
import { SetUSBPath } from "../components/setUSBPath.js";
import { StartingDriverPage } from "../components/StartingDriver.js";
import { ConfirmExitPage } from "../pages/ConfirmExit.js";
import { MainMenuPage } from "../pages/MainMenu.js";
import { PreparePage } from "../pages/Prepare.js";
import { RemoveFailedNodePage } from "../pages/RemoveFailedNode.js";

export enum CLIPage {
	Prepare,
	SetUSBPath,
	StartingDriver,
	DestroyingDriver,

	MainMenu,

	RemoveFailedNode,

	ConfirmExit,
}

export interface CLIPageWithProps {
	page: CLIPage;
	props?: {};
}

interface INavigationContext {
	previousPage?: CLIPage;
	currentPage: CLIPage;
	// TODO: type this better
	navigate: (page: CLIPage, pageProps?: {}) => void;
	back: () => boolean;
}

export const NavigationContext = React.createContext<INavigationContext>(
	{} as any,
);

export const useNavigation = () => React.useContext(NavigationContext);

export function getPageComponent(cliPage: CLIPage): React.FC<any> | undefined {
	switch (cliPage) {
		case CLIPage.Prepare:
			return PreparePage;
		case CLIPage.SetUSBPath:
			return SetUSBPath;

		case CLIPage.StartingDriver:
			return StartingDriverPage;
		case CLIPage.DestroyingDriver:
			return DestroyingDriverPage;

		case CLIPage.MainMenu:
			return MainMenuPage;

		case CLIPage.RemoveFailedNode:
			return RemoveFailedNodePage;

		case CLIPage.ConfirmExit:
			return ConfirmExitPage;
	}
	return undefined;
}
