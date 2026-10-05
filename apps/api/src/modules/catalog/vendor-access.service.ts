import { ForbiddenException, Injectable } from '@nestjs/common';
import { VendorMemberRole } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

const editorRoles: VendorMemberRole[] = [VendorMemberRole.OWNER, VendorMemberRole.EDITOR];

@Injectable()
export class VendorAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async canEditProduct(userId: string | undefined, productId: string): Promise<boolean> {
    if(!userId) {
      return false;
    }

    const product = await this.prisma.catalogProduct.findUnique({
      where: { id: productId },
      select: { vendorId: true },
    });

    if(!product) {
      return false;
    }

    const membership = await this.prisma.vendorMember.findUnique({
      where: {
        vendorId_userId: {
          vendorId: product.vendorId,
          userId,
        },
      },
    });

    return Boolean(membership && editorRoles.includes(membership.role));
  }

  async assertCanEditProduct(userId: string | undefined, productId: string): Promise<void> {
    const allowed = await this.canEditProduct(userId, productId);
    if(!allowed) {
      throw new ForbiddenException('You do not have permission to edit this product.');
    }
  }

  async assertCanEditVendor(userId: string, vendorId: string): Promise<void> {
    const membership = await this.prisma.vendorMember.findUnique({
      where: {
        vendorId_userId: {
          vendorId,
          userId,
        },
      },
    });

    if(!membership || !editorRoles.includes(membership.role)) {
      throw new ForbiddenException('You do not have permission to manage this vendor.');
    }
  }
}
