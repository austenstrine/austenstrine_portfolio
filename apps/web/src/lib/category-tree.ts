export type CategoryNode = {
	id: string;
	slug: string;
	name: string;
	parent?: { id: string; name: string; slug: string } | null;
};

export type CategoryTreeRow<T extends CategoryNode> = T & {
	depth: number;
	label: string;
};

export function sortCategoryTree<T extends CategoryNode>(
	rows: T[],
): CategoryTreeRow<T>[] {
	const byParent = new Map<string | null, T[]>();

	for(const row of rows) {
		const key = row.parent?.id ?? null;
		const list = byParent.get(key) ?? [];
		list.push(row);
		byParent.set(key, list);
	}

	for(const list of byParent.values()) {
		list.sort((left, right) => left.name.localeCompare(right.name));
	}

	const out: CategoryTreeRow<T>[] = [];

	const walk = (parentId: string | null, depth: number) => {
		for(const row of byParent.get(parentId) ?? []) {
			out.push({
				...row,
				depth,
				label: `${'— '.repeat(depth)}${row.name}`,
			});
			walk(row.id, depth + 1);
		}
	};

	walk(null, 0);
	return out;
}
