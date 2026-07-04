import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Grn } from '../database/entities/grn.entity';
import { Inspection } from '../database/entities/inspection.entity';
import { Invoice } from '../database/entities/invoice.entity';
import { PurchaseOrder } from '../database/entities/purchase-order.entity';
import { Quotation } from '../database/entities/quotation.entity';
import { Rfq } from '../database/entities/rfq.entity';
import { Supplier } from '../database/entities/supplier.entity';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, Quotation, PurchaseOrder, Grn, Inspection, Invoice, Rfq])],
  controllers: [SuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
