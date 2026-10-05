import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CatalogService } from './catalog.service';
import { CreateBrokenPackDto } from './dto/create-broken-pack.dto';
import { CreateCatalogProductDto } from './dto/create-catalog-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateUomDto } from './dto/create-uom.dto';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { TrimInventoryDto } from './dto/trim-inventory.dto';
import { UpdateCatalogProductDto } from './dto/update-catalog-product.dto';
import { InventoryService } from './inventory/inventory.service';
import { VendorService } from './vendor.service';

type AuthedRequest = Request & { user?: { id: string } };

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly inventory: InventoryService,
    private readonly vendors: VendorService,
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
}
