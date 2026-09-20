import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './entities/account.entity';

@Injectable()
export class AccountsService {
  constructor(@InjectRepository(Account) private readonly repo: Repository<Account>) {}

  /** كل الحسابات (تجميعي + فرعي، فعال وغير فعال) — لشاشة إدارة دليل الحسابات. */
  findAll(): Promise<Account[]> {
    return this.repo.find({ order: { code: 'ASC' } });
  }

  /** الحسابات القابلة للاختيار فعليًا في القيود/الشاشات الأخرى: فعالة وقابلة للترحيل فقط. */
  findPostable(type?: Account['type']): Promise<Account[]> {
    return this.repo.find({
      where: { isActive: true, isPostable: true, ...(type ? { type } : {}) },
      order: { code: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Account> {
    const account = await this.repo.findOneBy({ id });
    if (!account) {
      throw new NotFoundException(`Account ${id} not found`);
    }
    return account;
  }

  findByCode(code: string): Promise<Account | null> {
    return this.repo.findOneBy({ code });
  }

  create(data: Partial<Account>): Promise<Account> {
    return this.repo.save(this.repo.create(data));
  }

  async setActive(id: string, isActive: boolean): Promise<Account> {
    const account = await this.findOne(id);
    account.isActive = isActive;
    return this.repo.save(account);
  }
}
