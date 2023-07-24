import type { Driver } from "zwave-js";
import type { IDialogsContext } from "./src/hooks/useDialogs";

export interface ScriptContext {
	driver: Driver;
	showError: IDialogsContext["showError"];
	showWarning: IDialogsContext["showWarning"];
	showSuccess: IDialogsContext["showSuccess"];
	queryInput: IDialogsContext["queryInput"];
}
