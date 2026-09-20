import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityProfile } from './entities/entity-profile.entity';

@Injectable()
export class EntityProfileService {
  constructor(@InjectRepository(EntityProfile) private readonly repo: Repository<EntityProfile>) {}

  async get(): Promise<EntityProfile> {
    const [existing] = await this.repo.find({ take: 1 });
    if (existing) return existing;
    return this.repo.save(this.repo.create({}));
  }

  async update(data: Partial<EntityProfile>): Promise<EntityProfile> {
    const profile = await this.get();
    Object.assign(profile, data);
    return this.repo.save(profile);
  }
}
