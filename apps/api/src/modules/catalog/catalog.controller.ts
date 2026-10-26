import {
	BadRequestException,
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
import { AttributeService, assertCanReadHealth } from './attributes/attribute.service';
import { CatalogService } from './catalog.service';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import {
	CreateGlobalAttributeValueDto,
	UpsertVendorAttributeValueDto,
} from './dto/upsert-attribute-value.dto';
import { CatalogImportBodyDto } from './dto/catalog-import.dto';
import { CreateBrokenPackDto } from './dto/create-broken-pack.dto';
import { CreateCatalogProductDto } from './dto/create-catalog-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateUomDto } from './dto/create-uom.dto';
import { AcceptVendorInviteDto } from './dto/accept-vendor-invite.dto';
import { CreateVendorAppPasswordDto } from './dto/create-vendor-app-password.dto';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { CreateVendorInviteDto } from './dto/create-vendor-invite.dto';
import { DeleteCatalogProductsDto } from './dto/delete-catalog-products.dto';
import { RequestCategoryDto } from './dto/request-category.dto';
import { TrimInventoryDto } from './dto/trim-inventory.dto';
import { UpdateCatalogProductDto } from './dto/update-catalog-product.dto';
import type { CatalogAuthedRequest } from './guards/catalog-auth.guard';
import { CatalogAuthGuard } from './guards/catalog-auth.guard';
import { CatalogImportService } from './import/catalog-import.service';
import { InventoryService } from './inventory/inventory.service';
import { VendorAppPasswordService } from './vendor-app-password.service';
import { VendorInviteService } from './vendor-invite.service';
import { UomMergeService } from './uom-merge.service';
import { VendorService } from './vendor.service';

type AuthedRequest = Request & { user?: { id: string; email?: string } };

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
	constructor(
		private readonly catalog: CatalogService,
		private readonly attributeService: AttributeService,
		private readonly inventory: InventoryService,
		private readonly vendors: VendorService,
		private readonly invites: VendorInviteService,
		private readonly uomMerges: UomMergeService,
		private readonly appPasswords: VendorAppPasswordService,
		private readonly imports: CatalogImportService,
		private readonly archive: CatalogArchiveService,
	) {}

	@Get('uoms')
	listUoms(@Query('vendorId') vendorId?: string) {
		return this.catalog.listUoms(vendorId);
	}

	@Get('attributes')
	listAttributes(@Query('vendorId') vendorId?: string) {
		return this.catalog.listAttributes(vendorId);
	}

	@UseGuards(JwtAuthGuard)
	@Post('attributes')
	createAttribute(@Req() req: AuthedRequest, @Body() dto: CreateAttributeDto) {
		return this.attributeService.createAttribute(req.user!.id, dto);
	}

	@UseGuards(JwtAuthGuard)
	@Post('attributes/values')
	upsertVendorAttributeValue(
		@Req() req: AuthedRequest,
		@Body() dto: UpsertVendorAttributeValueDto,
	) {
		return this.attributeService.upsertVendorValue(req.user!.id, dto.vendorId, dto);
	}

	@UseGuards(JwtAuthGuard)
	@Post('attributes/values/global')
	createGlobalAttributeValue(
		@Req() req: AuthedRequest,
		@Body() dto: CreateGlobalAttributeValueDto,
	) {
		return this.attributeService.createGlobalValue(req.user!.id, dto);
	}

	@UseGuards(JwtAuthGuard)
	@Get('attributes/health')
	attributeHealth(@Req() req: AuthedRequest) {
		return this.attributeService.healthReportForUser(req.user!.id);
	}

	@UseGuards(JwtAuthGuard)
	@Get('products/by-id/:productId')
	getProductById(
		@Param('productId') productId: string,
		@Req() req: AuthedRequest,
	) {
		return this.catalog.getProductByProductId(productId, req.user!.id);
	}

	@UseGuards(JwtAuthGuard)
	@Post('uoms')
	createUom(@Req() req: AuthedRequest, @Body() dto: CreateUomDto) {
		return this.catalog.createUom(req.user!.id, dto);
	}

	@Get('uom-merges/apply')
	async applyUomMerge(@Query('token') token?: string) {
		if(!token?.trim()) {
			throw new BadRequestException('Merge token is required.');
		}
		return this.uomMerges.handleToken(token.trim());
	}

	@Get('categories')
	listCategories() {
		return this.catalog.listCategories();
	}

	@UseGuards(JwtAuthGuard)
	@Post('categories')
	createCategory(@Req() req: AuthedRequest, @Body() dto: CreateCategoryDto) {
		return this.catalog.createCategory(req.user!.id, dto);
	}

	@UseGuards(JwtAuthGuard)
	@Post('categories/request')
	requestCategory(@Req() req: AuthedRequest, @Body() dto: RequestCategoryDto) {
		return this.catalog.requestCategory(req.user!.id, req.user!.email ?? 'unknown', dto);
	}

	@UseGuards(JwtAuthGuard)
	@Get('tags/popular')
	listPopularTags(
		@Req() req: AuthedRequest,
		@Query('vendorId') vendorId?: string,
		@Query('limit') limit?: string,
	) {
		return this.catalog.listPopularTags({
			userId: req.user!.id,
			vendorId,
			limit: limit ? Number(limit) : undefined,
		});
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

	@UseGuards(JwtAuthGuard)
	@Get('vendors/:vendorId/invites')
	listVendorInvites(
		@Req() req: AuthedRequest,
		@Param('vendorId') vendorId: string,
	) {
		return this.invites.listInvites(req.user!.id, vendorId);
	}

	@UseGuards(JwtAuthGuard)
	@Post('vendors/:vendorId/invites')
	createVendorInvite(
		@Req() req: AuthedRequest,
		@Param('vendorId') vendorId: string,
		@Body() dto: CreateVendorInviteDto,
	) {
		return this.invites.createInvite(
			req.user!.id,
			vendorId,
			dto.email,
			dto.role,
		);
	}

	@UseGuards(JwtAuthGuard)
	@Delete('vendors/:vendorId/invites/:inviteId')
	revokeVendorInvite(
		@Req() req: AuthedRequest,
		@Param('vendorId') vendorId: string,
		@Param('inviteId') inviteId: string,
	) {
		return this.invites.revokeInvite(req.user!.id, vendorId, inviteId);
	}

	@Get('invites/peek')
	peekVendorInvite(@Query('token') token?: string) {
		if(!token?.trim()) {
			throw new BadRequestException('Invite token is required.');
		}
		return this.invites.peekInvite(token.trim());
	}

	@UseGuards(JwtAuthGuard)
	@Post('invites/accept')
	acceptVendorInvite(
		@Req() req: AuthedRequest,
		@Body() dto: AcceptVendorInviteDto,
	) {
		const email = req.user!.email;
		if(!email) {
			throw new BadRequestException('Authenticated user is missing an email address.');
		}
		return this.invites.acceptInvite(req.user!.id, email, dto.token);
	}

	@Get('products')
	searchProducts(
		@Query('q') q?: string,
		@Query('category') categorySlug?: string,
		@Query('vendor') vendorSlug?: string,
		@Query('limit') limit?: string,
		@Query('offset') offset?: string,
		@Query('sort') sort?: string,
		@Query('inStock') inStock?: string,
		@Query('rollupValueId') rollupValueId?: string | string[],
		@Query('omitValueId') omitValueId?: string | string[],
	) {
		const asList = (value?: string | string[]) =>
			(Array.isArray(value) ? value : value ? [value] : []).filter(Boolean);
		return this.catalog.searchProducts({
			q,
			categorySlug,
			vendorSlug,
			limit: limit ? Number(limit) : undefined,
			offset: offset ? Number(offset) : undefined,
			sort,
			inStock: inStock === '1' || inStock === 'true',
			rollupValueIds: asList(rollupValueId),
			omitValueIds: asList(omitValueId),
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
