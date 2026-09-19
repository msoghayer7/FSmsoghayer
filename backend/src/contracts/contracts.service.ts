import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from './entities/contract.entity';
import { ContractStatus } from '../common/enums';
import { generateDocumentNumber } from '../common/utils/document-number.util';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@Injectable()
export class ContractsService {
  constructor(@InjectRepository(Contract) private readonly repo: Repository<Contract>) {}

  findAll(): Promise<Contract[]> {
    return this.repo.find({ relations: ['lines', 'department'], order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Contract> {
    const contract = await this.repo.findOne({ where: { id }, relations: ['lines', 'department'] });
    if (!contract) {
      throw new NotFoundException(`Contract ${id} not found`);
    }
    return contract;
  }

  create(dto: CreateContractDto): Promise<Contract> {
    const contract = this.repo.create({
      ...dto,
      contractNumber: generateDocumentNumber('CTR'),
      currency: dto.currency ?? 'SAR',
      status: ContractStatus.DRAFT,
    });
    return this.repo.save(contract);
  }

  async update(id: string, dto: UpdateContractDto): Promise<Contract> {
    const contract = await this.findOne(id);
    if (contract.status !== ContractStatus.DRAFT) {
      throw new BadRequestException('Only draft contracts can be edited; use activate/renew/terminate instead');
    }
    Object.assign(contract, dto);
    return this.repo.save(contract);
  }

  async activate(id: string): Promise<Contract> {
    const contract = await this.findOne(id);
    if (contract.status !== ContractStatus.DRAFT) {
      throw new BadRequestException(`Cannot activate a contract in status ${contract.status}`);
    }
    contract.status = ContractStatus.ACTIVE;
    return this.repo.save(contract);
  }

  async renew(id: string, newEndDate: string, newTotalValue?: number): Promise<Contract> {
    const contract = await this.findOne(id);
    if (![ContractStatus.ACTIVE, ContractStatus.EXPIRED].includes(contract.status)) {
      throw new BadRequestException(`Cannot renew a contract in status ${contract.status}`);
    }
    contract.endDate = newEndDate;
    if (newTotalValue !== undefined) {
      contract.totalValue = newTotalValue;
    }
    contract.status = ContractStatus.RENEWED;
    return this.repo.save(contract);
  }

  async terminate(id: string): Promise<Contract> {
    const contract = await this.findOne(id);
    if ([ContractStatus.TERMINATED, ContractStatus.EXPIRED].includes(contract.status)) {
      throw new BadRequestException(`Contract is already ${contract.status}`);
    }
    contract.status = ContractStatus.TERMINATED;
    return this.repo.save(contract);
  }
}
