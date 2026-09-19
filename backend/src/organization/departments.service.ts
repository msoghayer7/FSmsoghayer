import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';

@Injectable()
export class DepartmentsService {
  constructor(@InjectRepository(Department) private readonly repo: Repository<Department>) {}

  findAll(): Promise<Department[]> {
    return this.repo.find({ order: { code: 'ASC' } });
  }

  create(data: Partial<Department>): Promise<Department> {
    return this.repo.save(this.repo.create(data));
  }
}
