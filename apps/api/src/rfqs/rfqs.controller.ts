import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedUser } from '../auth/types';
import { UserRole } from '../database/entities/enums';
import { CreateRfqDto } from './dto/create-rfq.dto';
import { SubmitQuoteDto } from './dto/submit-quote.dto';
import { RfqsService } from './rfqs.service';

@Controller('rfqs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RfqsController {
  constructor(private readonly rfqsService: RfqsService) {}

  @Post()
  @Roles(UserRole.BUYER_ADMIN, UserRole.BUYER_USER)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRfqDto) {
    return this.rfqsService.create(user, dto);
  }

  @Post(':id/publish')
  @Roles(UserRole.BUYER_ADMIN, UserRole.BUYER_USER)
  publish(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.rfqsService.publish(user, id);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.rfqsService.findAllForUser(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.rfqsService.findOneForUser(user, id);
  }

  @Post(':id/quotes')
  @Roles(UserRole.SUPPLIER_USER)
  submitQuote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitQuoteDto,
  ) {
    return this.rfqsService.submitQuote(user, id, dto);
  }

  @Get(':id/quotes')
  listQuotes(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.rfqsService.listQuotesForRfq(user, id);
  }

  @Get(':id/my-quote')
  @Roles(UserRole.SUPPLIER_USER)
  getMyQuote(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.rfqsService.getMyQuote(user, id);
  }
}
