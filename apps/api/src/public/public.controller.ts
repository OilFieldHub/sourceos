import { Controller, Get, Param } from '@nestjs/common';
import { PublicService } from './public.service';

/**
 * No JwtAuthGuard anywhere in this controller — these back the SEO pages
 * (Phase 9), which must be crawlable by search engines without a login.
 */
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('suppliers')
  listSuppliers() {
    return this.publicService.listSuppliers();
  }

  @Get('suppliers/:slug')
  findSupplier(@Param('slug') slug: string) {
    return this.publicService.findSupplierBySlug(slug);
  }

  @Get('categories')
  listCategories() {
    return this.publicService.listCategories();
  }

  @Get('categories/:slug')
  findCategory(@Param('slug') slug: string) {
    return this.publicService.findCategoryBySlug(slug);
  }

  @Get('compare/:slugA/:slugB')
  compare(@Param('slugA') slugA: string, @Param('slugB') slugB: string) {
    return this.publicService.compareSuppliers(slugA, slugB);
  }
}
