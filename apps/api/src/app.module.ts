import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { entities } from './database/entities';
import { DocumentsModule } from './documents/documents.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { EventsModule } from './events/events.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PublicModule } from './public/public.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { RfqsModule } from './rfqs/rfqs.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => {
        const isSqlite = config.get('DB_TYPE', 'postgres') === 'sqlite';

        if (isSqlite) {
          return {
            type: 'sqljs',
            location: config.get('DB_PATH', './data/oilfieldhub.sqlite'),
            autoSave: true,
            entities,
            synchronize: true,
            autoLoadEntities: false,
          };
        }

        return {
          type: 'postgres',
          host: config.get('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          username: config.get('DB_USERNAME', 'oilfieldhub'),
          password: config.get('DB_PASSWORD', 'oilfieldhub'),
          database: config.get('DB_DATABASE', 'oilfieldhub'),
          entities,
          synchronize: false,
          autoLoadEntities: false,
        };
      },
    }),
    UsersModule,
    OrganizationsModule,
    SuppliersModule,
    EventsModule,
    AuthModule,
    RfqsModule,
    EvaluationsModule,
    PurchaseOrdersModule,
    PublicModule,
    DocumentsModule,
  ],
})
export class AppModule {}
