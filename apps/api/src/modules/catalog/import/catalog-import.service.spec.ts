import { CatalogImportStatus, ProductOfferingRole } from '@prisma/client';
import { CatalogImportService } from './catalog-import.service';

type ParsedRow = {
	lineNumber: number;
	productSlug: string;
	title: string;
	sku: string;
	offeringKey: string;
	uomCode: string;
	role: ProductOfferingRole;
	priceCents: number;
	currency: string;
	qtyOnHand: string;
	attributes: Array<{ key: string; value: string }>;
};

function sampleRow(overrides?: Partial<ParsedRow>): ParsedRow {
	return {
		lineNumber: 2,
		productSlug: 'widget',
		title: 'Widget',
		sku: 'SKU-1',
		offeringKey: 'EACH',
		uomCode: 'EA',
		role: ProductOfferingRole.PIECE,
		priceCents: 100,
		currency: 'USD',
		qtyOnHand: '10',
		attributes: [],
		...overrides,
	};
}

describe('CatalogImportService runJob guards (PEM-199)', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	function buildService() {
		const prisma = {
			catalogImportJob: {
				updateMany: jest.fn().mockResolvedValue({ count: 1 }),
				update: jest.fn().mockResolvedValue({}),
			},
			unitOfMeasure: {
				findMany: jest.fn().mockResolvedValue([]),
			},
			catalogCategory: {
				findMany: jest.fn().mockResolvedValue([]),
			},
			productOffering: {
				findMany: jest.fn().mockResolvedValue([]),
			},
		};
		const vendorAccess = {};
		const inventory = {
			refreshProductAvailability: jest.fn().mockResolvedValue(undefined),
		};
		const service = new CatalogImportService(
			prisma as never,
			vendorAccess as never,
			inventory as never,
		);
		return { service, prisma, inventory };
	}

	async function runJob(
		service: CatalogImportService,
		rows: ParsedRow[],
	) {
		await (
			service as unknown as {
				runJob: (
					jobId: string,
					vendorId: string,
					rows: ParsedRow[],
				) => Promise<void>;
			}
		).runJob('job_1', 'vendor_1', rows);
	}

	it('CAS PENDING→RUNNING: skips work when claim loses', async () => {
		const { service, prisma, inventory } = buildService();
		prisma.catalogImportJob.updateMany.mockResolvedValue({ count: 0 });

		await runJob(service, [sampleRow()]);

		expect(prisma.catalogImportJob.updateMany).toHaveBeenCalledWith({
			where: { id: 'job_1', status: CatalogImportStatus.PENDING },
			data: { status: CatalogImportStatus.RUNNING },
		});
		expect(prisma.unitOfMeasure.findMany).not.toHaveBeenCalled();
		expect(prisma.catalogImportJob.update).not.toHaveBeenCalled();
		expect(inventory.refreshProductAvailability).not.toHaveBeenCalled();
	});

	it('marks FAILED when runtimeErrors.length > 0', async () => {
		const { service, prisma } = buildService();
		jest
			.spyOn(
				service as unknown as {
					upsertProductGroup: (...args: unknown[]) => Promise<unknown>;
				},
				'upsertProductGroup',
			)
			.mockRejectedValue(new Error('upsert boom'));

		await runJob(service, [sampleRow()]);

		expect(prisma.catalogImportJob.update).toHaveBeenCalledWith({
			where: { id: 'job_1' },
			data: expect.objectContaining({
				status: CatalogImportStatus.FAILED,
				errorCount: 1,
			}),
		});
	});

	it('marks COMPLETED when there are no runtime errors', async () => {
		const { service, prisma } = buildService();
		jest
			.spyOn(
				service as unknown as {
					upsertProductGroup: (...args: unknown[]) => Promise<unknown>;
				},
				'upsertProductGroup',
			)
			.mockResolvedValue({
				productId: 'prod_1',
				created: true,
				offeringIds: new Map([['SKU-1::EACH', 'off_1']]),
			});

		await runJob(service, [sampleRow()]);

		expect(prisma.catalogImportJob.update).toHaveBeenCalledWith({
			where: { id: 'job_1' },
			data: expect.objectContaining({
				status: CatalogImportStatus.COMPLETED,
				errorCount: 0,
				createdCount: 1,
			}),
		});
	});
});
