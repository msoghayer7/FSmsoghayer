import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './entities/expense.entity';
import { ExpenseAccrualSchedule } from './entities/expense-accrual-schedule.entity';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { AccountingModule } from '../accounting/accounting.module';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [TypeOrmModule.forFeature([Expense, ExpenseAccrualSchedule]), AccountingModule, ContractsModule],
  providers: [ExpensesService],
  controllers: [ExpensesController],
  exports: [TypeOrmModule, ExpensesService],
})
export class ExpensesModule {}
