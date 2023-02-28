import { useInput } from "ink";
import { Menu } from "./menu";

export interface ConfirmExitProps {
	onExit: () => void;
	onCancel: () => void;
}

export const ConfirmExit: React.FC<ConfirmExitProps> = (props) => {
	useInput((input, key) => {
		if (key.return) props.onExit();
		else if (key.escape) props.onCancel();
	});

	return (
		<Menu
			label="Are you sure you want to exit?"
			layoutProps={{
				alignSelf: "center",
			}}
			options={[
				{
					input: "x",
					label: "Yes, exit!",
					onSelect: props.onExit,
				},
				{
					input: "n",
					label: "No, back to main menu",
					onSelect: props.onCancel,
				},
			]}
		/>
	);
};
