import React from "react";

export type IDialogsContext = {
	showError(message: React.ReactNode): void;
	queryInput(
		message: React.ReactNode,
		initial?: string,
	): Promise<string | undefined>;
};

// Context that stores references to the methods that show Notifications and Modals
export const DialogsContext = React.createContext<IDialogsContext>({} as any);

export const useDialogs = () => React.useContext(DialogsContext);
