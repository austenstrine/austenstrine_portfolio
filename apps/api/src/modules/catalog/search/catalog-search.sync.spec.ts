import { applyOutboxRows } from './catalog-search.sync';

describe('catalog search outbox', () => {
	it('indexes and deletes catalog rows from trigger payloads', async () => {
		const scheduled: Array<[string, string, string]> = [];
		const search = {
			scheduleProduct: (id: string, op: 'index' | 'delete') => scheduled.push(['product', id, op]),
			scheduleAttribute: (id: string, op: 'index' | 'delete') => scheduled.push(['attribute', id, op]),
			scheduleAttributeValue: (id: string, op: 'index' | 'delete') => scheduled.push(['value', id, op]),
		};
		const prisma = {
			catalogProduct: { findMany: jest.fn().mockResolvedValue([{ id: 'p2' }]) },
			attributeValue: { findMany: jest.fn().mockResolvedValue([]) },
			productAttributeValue: { findMany: jest.fn().mockResolvedValue([{ productId: 'p3' }]) },
			productScalarValue: { findMany: jest.fn().mockResolvedValue([]) },
		};

		await applyOutboxRows(prisma, search, [
			{ id: '1', tableName: 'CatalogProduct', op: 'INSERT', rowId: 'p1', productId: null },
			{ id: '2', tableName: 'CatalogProduct', op: 'DELETE', rowId: 'p-del', productId: null },
			{ id: '3', tableName: 'Attribute', op: 'INSERT', rowId: 'a1', productId: null },
			{ id: '4', tableName: 'AttributeValue', op: 'UPDATE', rowId: 'v1', productId: null },
			{ id: '5', tableName: 'ProductAttributeValue', op: 'INSERT', rowId: 'j1', productId: 'p4' },
			{ id: '6', tableName: 'Vendor', op: 'UPDATE', rowId: 'vendor-1', productId: null },
			{ id: '7', tableName: 'Vendor', op: 'DELETE', rowId: 'vendor-gone', productId: null },
		]);

		expect(scheduled).toEqual([
			['product', 'p1', 'index'],
			['product', 'p-del', 'delete'],
			['attribute', 'a1', 'index'],
			['value', 'v1', 'index'],
			['product', 'p3', 'index'],
			['product', 'p4', 'index'],
			['product', 'p2', 'index'],
		]);
	});
});
