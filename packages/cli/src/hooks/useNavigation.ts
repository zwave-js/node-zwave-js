import React from "react";

export enum CLIPage {
	Prepare,
	SetUSBPath,
	StartingDriver,
	MainMenu,
	ConfirmExit,
}

interface INavigationContext {
	previousPage?: CLIPage;
	currentPage: CLIPage;
	navigate: (page: CLIPage) => void;
	back: () => boolean;
}

export const NavigationContext = React.createContext<INavigationContext>(
	{} as any,
);

export const useNavigation = () => React.useContext(NavigationContext);
