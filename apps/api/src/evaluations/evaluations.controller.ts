import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedUser } from '../auth/types';
import { UserRole } from '../database/entities/enums';
import { EvaluationsService } from './evaluations.service';

@Controller('rfqs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Post(':id/evaluate')
  @Roles(UserRole.BUYER_ADMIN, UserRole.BUYER_USER)
  evaluate(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.evaluationsService.evaluate(user, id);
  }

  @Get(':id/evaluations')
  list(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.evaluationsService.listForRfq(user, id);
  }
}
