import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrder } from '../database/entities/purchase-order.entity';
import { Rfq } from '../database/entities/rfq.entity';
import { Supplier } from '../database/entities/supplier.entity';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, PurchaseOrder, Rfq])],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
