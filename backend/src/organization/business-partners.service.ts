import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessPartner } from './entities/business-partner.entity';

@Injectable()
export class BusinessPartnersService {
  constructor(@InjectRepository(BusinessPartner) private readonly repo: Repository<BusinessPartner>) {}

  findAll(): Promise<BusinessPartner[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<BusinessPartner> {
    const partner = await this.repo.findOneBy({ id });
    if (!partner) {
      throw new NotFoundException(`Business partner ${id} not found`);
    }
    return partner;
  }

  create(data: Partial<BusinessPartner>): Promise<BusinessPartner> {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<BusinessPartner>): Promise<BusinessPartner> {
    await this.findOne(id);
    await this.repo.update(id, data);
    return this.findOne(id);
  }
}
