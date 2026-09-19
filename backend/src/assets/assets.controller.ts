import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AssetsService } from './assets.service';
import { CreateFixedAssetDto, DisposeAssetDto } from './dto/create-asset.dto';

@UseGuards(JwtAuthGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly service: AssetsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateFixedAssetDto) {
    return this.service.create(dto);
  }

  @Post(':id/record-acquisition')
  recordAcquisition(
    @Param('id') id: string,
    @Body() body: { payableAccountId?: string },
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.recordAcquisition(id, body?.payableAccountId, user?.userId);
  }

  @Post(':id/schedule/:scheduleId/post-depreciation')
  postDepreciation(
    @Param('id') id: string,
    @Param('scheduleId') scheduleId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.postDepreciationPeriod(id, scheduleId, user?.userId);
  }

  @Post(':id/dispose')
  dispose(@Param('id') id: string, @Body() dto: DisposeAssetDto, @CurrentUser() user: { userId: string }) {
    return this.service.disposeAsset(id, dto, user?.userId);
  }
}
