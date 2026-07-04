import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedUser } from '../auth/types';
import { UserRole } from '../database/entities/enums';
import { AwardDto } from './dto/award.dto';
import { PurchaseOrdersService } from './purchase-orders.service';

@Controller('rfqs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RfqAwardController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post(':id/award')
  @Roles(UserRole.BUYER_ADMIN, UserRole.BUYER_USER)
  award(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AwardDto) {
    return this.purchaseOrdersService.award(user, id, dto);
  }
}

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard)
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.purchaseOrdersService.findAllForUser(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.purchaseOrdersService.findOneForUser(user, id);
  }
}
