import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evaluation } from '../database/entities/evaluation.entity';
import { Grn } from '../database/entities/grn.entity';
import { Inspection } from '../database/entities/inspection.entity';
import { Invoice } from '../database/entities/invoice.entity';
import { Payment } from '../database/entities/payment.entity';
import { PurchaseOrder } from '../database/entities/purchase-order.entity';
import { Quotation } from '../database/entities/quotation.entity';
import { Rfq } from '../database/entities/rfq.entity';
import { EventsModule } from '../events/events.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { PurchaseOrderLifecycleController } from './purchase-order-lifecycle.controller';
import { PurchaseOrderLifecycleService } from './purchase-order-lifecycle.service';
import { PurchaseOrdersController, RfqAwardController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rfq, Evaluation, Quotation, PurchaseOrder, Grn, Inspection, Invoice, Payment]),
    SuppliersModule,
    EventsModule,
    OrganizationsModule,
  ],
  controllers: [RfqAwardController, PurchaseOrdersController, PurchaseOrderLifecycleController],
  providers: [PurchaseOrdersService, PurchaseOrderLifecycleService],
  exports: [PurchaseOrdersService, PurchaseOrderLifecycleService],
})
export class PurchaseOrdersModule {}
