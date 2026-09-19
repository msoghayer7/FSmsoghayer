import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssetCategory } from './entities/asset-category.entity';
import { CreateAssetCategoryDto } from './dto/create-asset.dto';

@Injectable()
export class AssetCategoriesService {
  constructor(@InjectRepository(AssetCategory) private readonly repo: Repository<AssetCategory>) {}

  findAll(): Promise<AssetCategory[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<AssetCategory> {
    const category = await this.repo.findOneBy({ id });
    if (!category) {
      throw new NotFoundException(`Asset category ${id} not found`);
    }
    return category;
  }

  create(dto: CreateAssetCategoryDto): Promise<AssetCategory> {
    return this.repo.save(this.repo.create(dto));
  }
}
