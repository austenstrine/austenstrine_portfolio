import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VendorMemberRole } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';

@Injectable()
export class VendorService {
  constructor(private readonly prisma: PrismaService) {}

  async createVendor(userId: string, dto: CreateVendorDto) {
    const slug = dto.slug.trim().toLowerCase();
    const name = dto.name.trim();

    const existing = await this.prisma.vendor.findUnique({ where: { slug } });
    if(existing) {
      throw new ConflictException('A vendor with that slug already exists.');
    }

    const vendor = await this.prisma.vendor.create({
      data: {
        name,
        slug,
        members: {
          create: {
            userId,
            role: VendorMemberRole.OWNER,
          },
        },
      },
      include: {
        members: {
          where: { userId },
          select: { role: true },
        },
        _count: { select: { products: true, members: true } },
      },
    });

    return this.toVendorSummary(vendor);
  }

  async listMyVendors(userId: string) {
    const memberships = await this.prisma.vendorMember.findMany({
      where: { userId },
      include: {
        vendor: {
          include: {
            _count: { select: { products: true, members: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((membership) => ({
      ...this.toVendorSummary({
        ...membership.vendor,
        members: [{ role: membership.role }],
      }),
      joinedAt: membership.createdAt,
    }));
  }

  async getMyVendor(userId: string, vendorId: string) {
    const membership = await this.prisma.vendorMember.findUnique({
      where: {
        vendorId_userId: { vendorId, userId },
      },
      include: {
        vendor: {
          include: {
            members: {
              include: {
                user: { select: { id: true, email: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
            _count: { select: { products: true, members: true } },
          },
        },
      },
    });

    if(!membership) {
      throw new NotFoundException('Vendor not found, or you are not a member.');
    }

    return {
      id: membership.vendor.id,
      name: membership.vendor.name,
      slug: membership.vendor.slug,
      createdAt: membership.vendor.createdAt,
      productCount: membership.vendor._count.products,
      memberCount: membership.vendor._count.members,
      myRole: membership.role,
      members: membership.vendor.members.map((member) => ({
        userId: member.user.id,
        email: member.user.email,
        role: member.role,
        joinedAt: member.createdAt,
      })),
    };
  }

  private toVendorSummary(vendor: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    members: Array<{ role: VendorMemberRole }>;
    _count: { products: number; members: number };
  }) {
    return {
      id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      createdAt: vendor.createdAt,
      productCount: vendor._count.products,
      memberCount: vendor._count.members,
      myRole: vendor.members[0]?.role ?? VendorMemberRole.VIEWER,
    };
  }
}
