import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetCategory } from './entities/asset-category.entity';
import { FixedAsset } from './entities/fixed-asset.entity';
import { AssetDepreciationSchedule } from './entities/asset-depreciation-schedule.entity';
import { AssetCategoriesService } from './asset-categories.service';
import { AssetCategoriesController } from './asset-categories.controller';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [TypeOrmModule.forFeature([AssetCategory, FixedAsset, AssetDepreciationSchedule]), AccountingModule],
  providers: [AssetCategoriesService, AssetsService],
  controllers: [AssetCategoriesController, AssetsController],
  exports: [TypeOrmModule, AssetsService, AssetCategoriesService],
})
export class AssetsModule {}
