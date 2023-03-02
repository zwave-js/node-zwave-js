import React from "react";

interface IMenuContext {
	updateItems: (
		added: MenuItem[],
		changed: MenuItem[],
		removed: MenuItem[],
	) => void;
}

export interface MenuItem {
	location:
		| "topLeft"
		| "topCenter"
		| "topRight"
		| "topCenter"
		| "bottomLeft"
		| "bottomCenter"
		| "bottomRight";
	item: React.ReactNode;
	visible?: boolean;
	compareTo?: (item: MenuItem) => -1 | 0 | 1;
}

export type MaybeMenuItem = MenuItem | null | undefined | false;

export const MenuContext = React.createContext<IMenuContext>({} as any);

function hashItem(item: MaybeMenuItem): string {
	if (!item) return "";
	return JSON.stringify({
		location: item.location,
		visible: item.visible ?? true,
	});
}

function hashItems(items: MaybeMenuItem[]): string {
	return items.map(hashItem).join(";");
}

export function useMenu(items: MaybeMenuItem[]): () => void {
	const itemsRef = React.useRef(new Map<MenuItem, string>());
	const context = React.useContext(MenuContext);

	const setMenuItems = React.useCallback(
		(_items: MaybeMenuItem[]) => {
			const items = _items.filter((item) => !!item) as MenuItem[];
			const newItems = items.filter(
				(item) => !itemsRef.current.has(item),
			);
			const removedItems = [...itemsRef.current.keys()].filter(
				(item) => !items.includes(item),
			);
			const changedItems = items.filter(
				(item) =>
					itemsRef.current.has(item) &&
					itemsRef.current.get(item) !== hashItem(item),
			);

			for (const item of removedItems) {
				itemsRef.current.delete(item);
			}
			for (const item of newItems) {
				itemsRef.current.set(item, hashItem(item));
			}
			for (const item of changedItems) {
				itemsRef.current.set(item, hashItem(item));
			}

			if (newItems.length || changedItems.length || removedItems.length) {
				context.updateItems(newItems, changedItems, removedItems);
			}
		},
		[context, itemsRef],
	);

	React.useEffect(() => {
		setMenuItems(items);

		// Remove all registered menu items when unmounting
		return () => {
			context.updateItems([], [], Array.from(itemsRef.current.keys()));
		};
	}, []);

	// Update menu items when the items array hash changes
	React.useEffect(() => {
		setMenuItems(items);
	}, [hashItems(items)]);

	// Return a hook to force-update if we cannot detec the changes
	return () => setMenuItems(items);
}
