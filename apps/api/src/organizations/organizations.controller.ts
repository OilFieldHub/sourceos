import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedUser } from '../auth/types';
import { UserRole } from '../database/entities/enums';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('me')
  getOwnOrganization(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.findById(user.organizationId);
  }

  @Patch('me')
  @Roles(UserRole.BUYER_ADMIN, UserRole.ADMIN)
  updateOwnOrganization(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.update(user.organizationId, dto);
  }

  /** Platform-wide admin verification queue — see OrganizationsService.findPending. */
  @Get('pending')
  @Roles(UserRole.ADMIN)
  getPending() {
    return this.organizationsService.findPending();
  }

  @Post(':id/verify')
  @Roles(UserRole.ADMIN)
  verify(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.organizationsService.verify(id, user.userId);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN)
  reject(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.organizationsService.reject(id, user.userId);
  }
}
