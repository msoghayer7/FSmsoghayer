import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssetCategoriesService } from './asset-categories.service';
import { CreateAssetCategoryDto } from './dto/create-asset.dto';

@UseGuards(JwtAuthGuard)
@Controller('asset-categories')
export class AssetCategoriesController {
  constructor(private readonly service: AssetCategoriesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAssetCategoryDto) {
    return this.service.create(dto);
  }
}
