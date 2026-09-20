import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { PolicyDocument } from './entities/policy-document.entity';
import { PolicyCategory } from '../common/enums';

@Injectable()
export class PolicyLibraryService {
  constructor(@InjectRepository(PolicyDocument) private readonly repo: Repository<PolicyDocument>) {}

  findAll(category?: PolicyCategory, search?: string): Promise<PolicyDocument[]> {
    const categoryFilter = category ? { category } : {};
    if (!search) {
      return this.repo.find({ where: categoryFilter, order: { category: 'ASC', title: 'ASC' } });
    }
    return this.repo.find({
      where: [
        { ...categoryFilter, title: ILike(`%${search}%`) },
        { ...categoryFilter, code: ILike(`%${search}%`) },
      ],
      order: { category: 'ASC', title: 'ASC' },
    });
  }
}
