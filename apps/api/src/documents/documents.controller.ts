import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types';
import { DocumentsService } from './documents.service';
import { FileDocumentDto } from './dto/file-document.dto';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  file(@CurrentUser() user: AuthenticatedUser, @Body() dto: FileDocumentDto) {
    return this.documentsService.file(user, dto);
  }

  @Get()
  findForEntity(
    @CurrentUser() user: AuthenticatedUser,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.documentsService.findForEntity(user, entityType, entityId);
  }

  @Get(':code')
  findByCode(@CurrentUser() user: AuthenticatedUser, @Param('code') code: string) {
    return this.documentsService.findByCode(user, code);
  }

  @Post(':id/archive')
  archive(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.archive(user, id);
  }
}
