import { Menu } from "./menu";

export interface MainMenuProps {
	onSetUSBPath: () => void;
	onExit: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = (props) => {
	return (
		<Menu
			layoutProps={{
				alignSelf: "center",
			}}
			options={[
				{
					input: "c",
					label: "Set USB path",
					onSelect: props.onSetUSBPath,
				},
				{
					input: "x",
					label: "Exit",
					onSelect: props.onExit,
					textProps: {
						color: "red",
						dimColor: true,
					},
				},
			]}
		/>
	);
};
