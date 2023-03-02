import { pick } from "@zwave-js/shared/safe";
import type { BoxProps } from "ink";

export type OuterBoxProps = Pick<
	BoxProps,
	| "position"
	| "marginLeft"
	| "marginRight"
	| "marginTop"
	| "marginBottom"
	| "margin"
	| "marginX"
	| "marginY"
	| "flexGrow"
	| "flexShrink"
	| "flexBasis"
	| "alignSelf"
	| "width"
	| "height"
	| "minWidth"
	| "minHeight"
	| "borderStyle"
	| "borderColor"
>;

export type InnerBoxProps = Pick<
	BoxProps,
	| "paddingLeft"
	| "paddingRight"
	| "paddingTop"
	| "paddingBottom"
	| "flexDirection"
	| "alignItems"
	| "justifyContent"
	| "padding"
	| "paddingX"
	| "paddingY"
>;

export function getOuterBoxProps(props: BoxProps): OuterBoxProps {
	return pick(props, [
		"position",
		"marginLeft",
		"marginRight",
		"marginTop",
		"marginBottom",
		"margin",
		"marginX",
		"marginY",
		"flexGrow",
		"flexShrink",
		"flexBasis",
		"alignSelf",
		"width",
		"height",
		"minWidth",
		"minHeight",
		"borderStyle",
		"borderColor",
	]);
}

export function getInnerBoxProps(props: BoxProps): InnerBoxProps {
	return pick(props, [
		"paddingLeft",
		"paddingRight",
		"paddingTop",
		"paddingBottom",
		"flexDirection",
		"alignItems",
		"justifyContent",
		"padding",
		"paddingX",
		"paddingY",
	]);
}
