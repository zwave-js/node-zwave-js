import React from "react";

export type Action = void;

interface IActionsContext {
	do: (what: Action) => void;
}

export const ActionsContext = React.createContext<IActionsContext>({} as any);

export const useActions = () => React.useContext(ActionsContext);
