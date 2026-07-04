import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotationItem } from '../database/entities/quotation-item.entity';
import { Quotation } from '../database/entities/quotation.entity';
import { Rfq } from '../database/entities/rfq.entity';
import { RfqItem } from '../database/entities/rfq-item.entity';
import { EventsModule } from '../events/events.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { RfqsController } from './rfqs.controller';
import { RfqsService } from './rfqs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rfq, RfqItem, Quotation, QuotationItem]),
    SuppliersModule,
    EventsModule,
  ],
  controllers: [RfqsController],
  providers: [RfqsService],
})
export class RfqsModule {}
