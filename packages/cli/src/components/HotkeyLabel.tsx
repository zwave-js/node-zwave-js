import { Text, TextProps, useInput } from "ink";
import Spinner from "ink-spinner";
import { useState } from "react";

export interface HotkeyLabelProps extends TextProps {
	label?: string;
	hotkey?: string;
	modifiers?: Modifiers;
	onPress?: () => Promise<void> | void;
}

type Modifiers = ("ctrl" | "shift")[];

const specialKeys: Record<string, string> = {
	upArrow: "↑",
	downArrow: "↓",
	leftArrow: "←",
	rightArrow: "→",
	pageDown: "PgDn",
	pageUp: "PgUp",
	return: "↲",
	escape: "Esc",
	tab: "↹",
	backspace: "⤆",
	delete: "Del",
};

function modifiersToString(modifiers: Modifiers | undefined = []): string {
	let ret = "";
	if (modifiers.includes("ctrl")) ret += "Ctrl+";
	if (modifiers.includes("shift")) ret += "⇧+";
	return ret;
}

function renderHotkey(hotkey: string, modifiers: Modifiers | undefined) {
	if (hotkey in specialKeys) {
		return modifiersToString(modifiers) + specialKeys[hotkey];
	} else {
		return modifiersToString(modifiers) + hotkey.toUpperCase();
	}
}

export const HotkeyLabel: React.FC<HotkeyLabelProps> = (props) => {
	const { hotkey, label, modifiers, ...textProps } = props;
	// Apply some default text props
	textProps.color ??= "red";
	textProps.bold ??= true;

	const { color, children, ...rest } = textProps;

	const [isBusy, setIsBusy] = useState(false);

	const busyProps: TextProps = isBusy
		? {
				color: "greenBright",
		  }
		: {};

	useInput(async (input, key) => {
		if (
			!isBusy &&
			hotkey &&
			props.onPress &&
			(input === hotkey ||
				(hotkey in specialKeys && (key as any)[hotkey])) &&
			((modifiers && modifiers.every((mod) => key[mod])) ||
				(!modifiers && !key.ctrl && !key.shift))
		) {
			setIsBusy(true);
			await props.onPress();
			setIsBusy(false);
		}
	});

	const BusySpinner = isBusy ? (
		<>
			{" "}
			<Spinner type="dots" />
		</>
	) : null;

	if (!label) {
		if (hotkey) {
			return (
				<Text {...textProps} {...busyProps}>
					{renderHotkey(hotkey, modifiers)}
					{BusySpinner}
				</Text>
			);
		} else {
			throw new Error("At least one of label or hotkey must be provided");
		}
	}

	if (!hotkey) {
		return (
			<Text {...textProps} {...busyProps}>
				{label}
				{BusySpinner}
			</Text>
		);
	} else if (hotkey.length !== 1 && !(hotkey in specialKeys)) {
		throw new Error("Hotkey must be a single character or a special key");
	}

	const hotkeyIndex =
		hotkey.length === 1 && !modifiers?.length
			? label.toLowerCase().indexOf(hotkey.toLowerCase())
			: -1;
	if (isBusy) {
		return (
			<Text {...rest} {...busyProps}>
				{label}
				{BusySpinner}
			</Text>
		);
	} else if (hotkeyIndex >= 0) {
		return (
			<Text {...rest}>
				{label.slice(0, hotkeyIndex)}
				<Text color={color}>
					{label.slice(hotkeyIndex, hotkeyIndex + 1)}
				</Text>
				{label.slice(hotkeyIndex + 1)}
				{BusySpinner}
			</Text>
		);
	} else {
		return (
			<Text {...rest}>
				{label}{" "}
				<Text color={color}>{renderHotkey(hotkey, modifiers)}</Text>
				{BusySpinner}
			</Text>
		);
	}
};
