import React from "react";
import { SetUSBPath } from "../components/setUSBPath.js";
import { ConfirmExitPage } from "../pages/ConfirmExit.js";
import { DestroyingDriverPage } from "../pages/DestroyingDriver.js";
import { ExcludeNodePage } from "../pages/ExcludeNode.js";
import {
	BootstrappingNodePage,
	IncludeNodePage,
} from "../pages/IncludeNode.js";
import { MainMenuPage } from "../pages/MainMenu.js";
import { PreparePage } from "../pages/Prepare.js";
import { RemoveFailedNodePage } from "../pages/RemoveFailedNode.js";
import { StartingDriverPage } from "../pages/StartingDriver.js";

export enum CLIPage {
	Prepare,
	SetUSBPath,
	StartingDriver,
	DestroyingDriver,

	MainMenu,

	IncludeNode,
	BootstrappingNode,
	ExcludeNode,
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

		case CLIPage.IncludeNode:
			return IncludeNodePage;
		case CLIPage.BootstrappingNode:
			return BootstrappingNodePage;

		case CLIPage.ExcludeNode:
			return ExcludeNodePage;
		case CLIPage.RemoveFailedNode:
			return RemoveFailedNodePage;

		case CLIPage.ConfirmExit:
			return ConfirmExitPage;
	}
	return undefined;
}
