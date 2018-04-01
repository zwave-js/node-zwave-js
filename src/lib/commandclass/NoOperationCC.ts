import { commandClass, CommandClasses, SendDataRequest } from "./SendDataMessages";

@commandClass(CommandClasses["No Operation"])
export class NoOperationCC extends SendDataRequest {

}
