import {
	Body,
	Controller,
	Delete,
	Get,
	Header,
	Param,
	Patch,
	Post,
	Query,
	Req,
	Res,
	UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CatalogImportSource } from '@prisma/client';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CatalogArchiveService } from './archive/catalog-archive.service';
import { CatalogService } from './catalog.service';
import { CatalogImportBodyDto } from './dto/catalog-import.dto';
import { CreateBrokenPackDto } from './dto/create-broken-pack.dto';
import { CreateCatalogProductDto } from './dto/create-catalog-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateUomDto } from './dto/create-uom.dto';
import { CreateVendorAppPasswordDto } from './dto/create-vendor-app-password.dto';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { DeleteCatalogProductsDto } from './dto/delete-catalog-products.dto';
import { TrimInventoryDto } from './dto/trim-inventory.dto';
import { UpdateCatalogProductDto } from './dto/update-catalog-product.dto';
import type { CatalogAuthedRequest } from './guards/catalog-auth.guard';
import { CatalogAuthGuard } from './guards/catalog-auth.guard';
import { CatalogImportService } from './import/catalog-import.service';
import { InventoryService } from './inventory/inventory.service';
import { VendorAppPasswordService } from './vendor-app-password.service';
import { VendorService } from './vendor.service';

type AuthedRequest = Request & { user?: { id: string } };

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
	constructor(
		private readonly catalog: CatalogService,
		private readonly inventory: InventoryService,
		private readonly vendors: VendorService,
		private readonly appPasswords: VendorAppPasswordService,
		private readonly imports: CatalogImportService,
		private readonly archive: CatalogArchiveService,
	) {}

	@Get('uoms')
	listUoms() {
		return this.catalog.listUoms();
	}

	@UseGuards(JwtAuthGuard)
	@Post('uoms')
	createUom(@Body() dto: CreateUomDto) {
		return this.catalog.createUom(dto);
	}

	@Get('categories')
	listCategories() {
		return this.catalog.listCategories();
	}

	@UseGuards(JwtAuthGuard)
	@Post('categories')
	createCategory(@Body() dto: CreateCategoryDto) {
		return this.catalog.createCategory(dto);
	}

	@UseGuards(JwtAuthGuard)
	@Get('vendors/mine')
	listMyVendors(@Req() req: AuthedRequest) {
		return this.vendors.listMyVendors(req.user!.id);
	}

	@UseGuards(JwtAuthGuard)
	@Get('vendors/mine/:vendorId')
	getMyVendor(@Req() req: AuthedRequest, @Param('vendorId') vendorId: string) {
		return this.vendors.getMyVendor(req.user!.id, vendorId);
	}

	@UseGuards(JwtAuthGuard)
	@Post('vendors')
	createVendor(@Req() req: AuthedRequest, @Body() dto: CreateVendorDto) {
		return this.vendors.createVendor(req.user!.id, dto);
	}

	@Get('products')
	searchProducts(
		@Query('q') q?: string,
		@Query('category') categorySlug?: string,
		@Query('vendor') vendorSlug?: string,
		@Query('limit') limit?: string,
	) {
		return this.catalog.searchProducts({
			q,
			categorySlug,
			vendorSlug,
			limit: limit ? Number(limit) : undefined,
		});
	}

	@UseGuards(OptionalJwtAuthGuard)
	@Get('products/:vendorSlug/:productSlug')
	getProduct(
		@Param('vendorSlug') vendorSlug: string,
		@Param('productSlug') productSlug: string,
		@Req() req: AuthedRequest,
	) {
		return this.catalog.getProduct(vendorSlug, productSlug, req.user?.id);
	}

	@UseGuards(JwtAuthGuard)
	@Post('products')
	createProduct(@Req() req: AuthedRequest, @Body() dto: CreateCatalogProductDto) {
		return this.catalog.createProduct(req.user!.id, dto);
	}

	@UseGuards(JwtAuthGuard)
	@Patch('products/:productId')
	updateProduct(
		@Req() req: AuthedRequest,
		@Param('productId') productId: string,
		@Body() dto: UpdateCatalogProductDto,
	) {
		return this.catalog.updateProduct(req.user!.id, productId, dto);
	}

	@UseGuards(CatalogAuthGuard)
	@Delete('products/:productId')
	deleteProduct(
		@Req() req: CatalogAuthedRequest,
		@Param('productId') productId: string,
	) {
		return this.archive.deleteProductById(req.catalogActor!, productId);
	}

	@UseGuards(CatalogAuthGuard)
	@Post('vendors/:vendorId/products/delete')
	deleteVendorProducts(
		@Req() req: CatalogAuthedRequest,
		@Param('vendorId') vendorId: string,
		@Body() dto: DeleteCatalogProductsDto,
	) {
		return this.archive.deleteProductsForVendor(req.catalogActor!, vendorId, dto);
	}

	@UseGuards(JwtAuthGuard)
	@Post('inventory/broken-packs')
	createBrokenPack(@Req() req: AuthedRequest, @Body() dto: CreateBrokenPackDto) {
		return this.catalog.createBrokenPack(req.user!.id, dto);
	}

	@UseGuards(JwtAuthGuard)
	@Post('inventory/trim')
	trimInventory(@Req() req: AuthedRequest, @Body() dto: TrimInventoryDto) {
		return this.catalog.trimInventory(req.user!.id, dto);
	}

	@UseGuards(JwtAuthGuard)
	@Post('inventory/refresh/:offeringId')
	refreshAvailability(@Param('offeringId') offeringId: string) {
		return this.inventory.refreshOfferingAvailability(offeringId);
	}

	@UseGuards(JwtAuthGuard)
	@Get('vendors/:vendorId/app-passwords')
	listAppPasswords(@Req() req: AuthedRequest, @Param('vendorId') vendorId: string) {
		return this.appPasswords.list(req.user!.id, vendorId);
	}

	@UseGuards(JwtAuthGuard)
	@Post('vendors/:vendorId/app-passwords')
	createAppPassword(
		@Req() req: AuthedRequest,
		@Param('vendorId') vendorId: string,
		@Body() dto: CreateVendorAppPasswordDto,
	) {
		return this.appPasswords.create(req.user!.id, vendorId, dto.name ?? 'Server access');
	}

	@UseGuards(JwtAuthGuard)
	@Delete('vendors/:vendorId/app-passwords/:passwordId')
	revokeAppPassword(
		@Req() req: AuthedRequest,
		@Param('vendorId') vendorId: string,
		@Param('passwordId') passwordId: string,
	) {
		return this.appPasswords.revoke(req.user!.id, vendorId, passwordId);
	}

	@Get('imports/template.csv')
	@Header('Content-Type', 'text/csv; charset=utf-8')
	@Header('Content-Disposition', 'attachment; filename="catalog-import-template.csv"')
	importTemplate(@Res() res: Response) {
		res.type('text/csv').send(this.imports.getTemplateCsv());
	}

	@UseGuards(CatalogAuthGuard)
	@Post('vendors/:vendorId/imports/validate')
	validateImport(
		@Req() req: CatalogAuthedRequest,
		@Param('vendorId') vendorId: string,
		@Body() dto: CatalogImportBodyDto,
	) {
		return this.imports.validate(req.catalogActor!, vendorId, dto.csv);
	}

	@UseGuards(CatalogAuthGuard)
	@Post('vendors/:vendorId/imports/commit')
	commitImport(
		@Req() req: CatalogAuthedRequest,
		@Param('vendorId') vendorId: string,
		@Body() dto: CatalogImportBodyDto,
	) {
		const source =
			dto.source === 'API' ? CatalogImportSource.API : CatalogImportSource.UI;
		return this.imports.commit(req.catalogActor!, vendorId, dto.csv, source);
	}

	@UseGuards(CatalogAuthGuard)
	@Get('vendors/:vendorId/imports/:jobId')
	getImportJob(
		@Req() req: CatalogAuthedRequest,
		@Param('vendorId') vendorId: string,
		@Param('jobId') jobId: string,
	) {
		return this.imports.getJob(req.catalogActor!, vendorId, jobId);
	}
}
