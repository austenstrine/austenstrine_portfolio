import type { CatalogSearchService } from './catalog-search.service';

export type CatalogSearchOutboxRow = {
	id: string;
	tableName: string;
	op: string;
	rowId: string;
	productId: string | null;
};

type SearchTarget = Pick<
	CatalogSearchService,
	'scheduleProduct' | 'scheduleAttribute' | 'scheduleAttributeValue'
>;

type LookupPrisma = {
	catalogProduct: { findMany: Function };
	attributeValue: { findMany: Function };
	productAttributeValue: { findMany: Function };
	productScalarValue: { findMany: Function };
};

function isDelete(op: string) {
	return op === 'DELETE';
}

export async function applyOutboxRows(
	prisma: LookupPrisma,
	search: SearchTarget,
	rows: CatalogSearchOutboxRow[],
) {
	for(const row of rows) {
		await applyOutboxRow(prisma, search, row);
	}
}

async function applyOutboxRow(
	prisma: LookupPrisma,
	search: SearchTarget,
	row: CatalogSearchOutboxRow,
) {
	const deleting = isDelete(row.op);

	if(row.tableName === 'CatalogProduct') {
		search.scheduleProduct(row.rowId, deleting ? 'delete' : 'index');
		return;
	}

	if(row.tableName === 'Attribute') {
		search.scheduleAttribute(row.rowId, deleting ? 'delete' : 'index');
		if(!deleting) {
			await scheduleProductsForAttribute(prisma, search, row.rowId);
		}
		return;
	}

	if(row.tableName === 'AttributeValue') {
		search.scheduleAttributeValue(row.rowId, deleting ? 'delete' : 'index');
		if(!deleting) {
			const links = await prisma.productAttributeValue.findMany({
				where: { attributeValueId: row.rowId },
				select: { productId: true },
			});
			for(const link of links as Array<{ productId: string }>) {
				search.scheduleProduct(link.productId, 'index');
			}
		}
		return;
	}

	if(
		row.tableName === 'ProductAttributeValue'
		|| row.tableName === 'ProductScalarValue'
		|| row.tableName === 'ProductOffering'
	) {
		if(row.productId) {
			search.scheduleProduct(row.productId, 'index');
		}
		return;
	}

	if(row.tableName === 'Vendor' && !deleting) {
		const products = await prisma.catalogProduct.findMany({
			where: { vendorId: row.rowId },
			select: { id: true },
		});
		for(const product of products as Array<{ id: string }>) {
			search.scheduleProduct(product.id, 'index');
		}
		return;
	}

	if(row.tableName === 'CatalogCategory' && !deleting) {
		const products = await prisma.catalogProduct.findMany({
			where: { categoryId: row.rowId },
			select: { id: true },
		});
		for(const product of products as Array<{ id: string }>) {
			search.scheduleProduct(product.id, 'index');
		}
	}
}

async function scheduleProductsForAttribute(
	prisma: LookupPrisma,
	search: SearchTarget,
	attributeId: string,
) {
	const values = await prisma.attributeValue.findMany({
		where: { attributeId },
		select: { id: true },
	});
	const valueIds = (values as Array<{ id: string }>).map((row) => row.id);
	const links = valueIds.length
		? await prisma.productAttributeValue.findMany({
			where: { attributeValueId: { in: valueIds } },
			select: { productId: true },
		})
		: [];
	const scalars = await prisma.productScalarValue.findMany({
		where: { attributeId },
		select: { productId: true },
	});
	for(const row of [...links, ...scalars] as Array<{ productId: string }>) {
		search.scheduleProduct(row.productId, 'index');
	}
}
