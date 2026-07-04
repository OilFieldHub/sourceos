import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedUser } from '../auth/types';
import { UserRole } from '../database/entities/enums';
import { OpenDisputeDto } from './dto/open-dispute.dto';
import { SubmitGrnDto } from './dto/submit-grn.dto';
import { SubmitInspectionDto } from './dto/submit-inspection.dto';
import { PurchaseOrderLifecycleService } from './purchase-order-lifecycle.service';

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseOrderLifecycleController {
  constructor(private readonly lifecycleService: PurchaseOrderLifecycleService) {}

  @Get(':id/fulfillment')
  getFulfillment(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.lifecycleService.getFulfillment(user, id);
  }

  @Post(':id/approve')
  @Roles(UserRole.BUYER_ADMIN)
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.lifecycleService.approve(user, id);
  }

  @Post(':id/fund-escrow')
  @Roles(UserRole.BUYER_ADMIN, UserRole.BUYER_USER)
  fundEscrow(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.lifecycleService.fundEscrow(user, id);
  }

  @Post(':id/acknowledge')
  @Roles(UserRole.SUPPLIER_USER)
  acknowledge(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.lifecycleService.acknowledge(user, id);
  }

  @Post(':id/grn')
  @Roles(UserRole.BUYER_ADMIN, UserRole.BUYER_USER)
  submitGrn(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitGrnDto,
  ) {
    return this.lifecycleService.submitGrn(user, id, dto);
  }

  @Post(':id/inspection')
  @Roles(UserRole.BUYER_ADMIN, UserRole.BUYER_USER)
  submitInspection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitInspectionDto,
  ) {
    return this.lifecycleService.submitInspection(user, id, dto);
  }

  @Post(':id/resolve-exception')
  @Roles(UserRole.BUYER_ADMIN, UserRole.BUYER_USER)
  resolveException(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.lifecycleService.resolveException(user, id);
  }

  @Post(':id/invoice')
  @Roles(UserRole.SUPPLIER_USER)
  submitInvoice(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.lifecycleService.submitInvoice(user, id);
  }

  @Post(':id/release-payment')
  @Roles(UserRole.BUYER_ADMIN)
  releasePayment(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.lifecycleService.releasePayment(user, id);
  }

  @Post(':id/dispute')
  @Roles(UserRole.BUYER_ADMIN, UserRole.BUYER_USER)
  openDispute(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OpenDisputeDto,
  ) {
    return this.lifecycleService.openDispute(user, id, dto);
  }

  @Post(':id/dispute/mediate')
  @Roles(UserRole.ADMIN)
  mediateDispute(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.lifecycleService.mediateDispute(user, id);
  }

  @Post(':id/dispute/resolve')
  @Roles(UserRole.ADMIN)
  resolveDispute(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.lifecycleService.resolveDispute(user, id);
  }
}
