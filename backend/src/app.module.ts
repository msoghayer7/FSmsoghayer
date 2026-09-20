import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationModule } from './organization/organization.module';
import { AccountingModule } from './accounting/accounting.module';
import { ContractsModule } from './contracts/contracts.module';
import { ExpensesModule } from './expenses/expenses.module';
import { AssetsModule } from './assets/assets.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'fsm_user'),
        password: config.get<string>('DB_PASSWORD', 'fsm_password'),
        database: config.get<string>('DB_DATABASE', 'fsm_erp'),
        autoLoadEntities: true,
        // MVP convenience: schema is generated from entities. Replace with
        // TypeORM migrations before running against production data.
        synchronize: true,
      }),
    }),
    AuthModule,
    UsersModule,
    OrganizationModule,
    AccountingModule,
    ContractsModule,
    ExpensesModule,
    AssetsModule,
  ],
})
export class AppModule {}
