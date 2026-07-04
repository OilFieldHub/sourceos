import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedUser } from '../auth/types';
import { UserRole } from '../database/entities/enums';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  /** Buyer-side directory so RFQ creation can pick invitees by id. */
  @Get()
  @Roles(UserRole.BUYER_ADMIN, UserRole.BUYER_USER)
  findAll() {
    return this.suppliersService.findAll();
  }

  @Get('me')
  @Roles(UserRole.SUPPLIER_USER)
  async getOwnProfile(@CurrentUser() user: AuthenticatedUser) {
    const supplier = await this.suppliersService.findByOrganizationId(user.organizationId);
    if (!supplier) {
      throw new NotFoundException('Supplier profile not found');
    }
    return supplier;
  }

  @Get('me/history')
  @Roles(UserRole.SUPPLIER_USER)
  getOwnHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.suppliersService.getHistory(user.organizationId);
  }

  /** Cross-buyer network-effect signal — visible to buyers and suppliers alike, not org-scoped. */
  @Get('category-demand')
  @Roles(UserRole.BUYER_ADMIN, UserRole.BUYER_USER, UserRole.SUPPLIER_USER)
  getCategoryDemand() {
    return this.suppliersService.getCategoryDemand();
  }
}
