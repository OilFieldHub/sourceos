import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evaluation } from '../database/entities/evaluation.entity';
import { QuotationItem } from '../database/entities/quotation-item.entity';
import { Quotation } from '../database/entities/quotation.entity';
import { Rfq } from '../database/entities/rfq.entity';
import { EventsModule } from '../events/events.module';
import { CommodityContextService } from './commodity-context.service';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';
import { PriceIndexService } from './price-index.service';

@Module({
  imports: [TypeOrmModule.forFeature([Rfq, Quotation, QuotationItem, Evaluation]), EventsModule],
  controllers: [EvaluationsController],
  providers: [EvaluationsService, PriceIndexService, CommodityContextService],
  exports: [EvaluationsService, PriceIndexService],
})
export class EvaluationsModule {}
