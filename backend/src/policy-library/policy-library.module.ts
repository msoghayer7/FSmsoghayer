import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PolicyDocument } from './entities/policy-document.entity';
import { PolicyLibraryService } from './policy-library.service';
import { PolicyLibraryController } from './policy-library.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PolicyDocument])],
  providers: [PolicyLibraryService],
  controllers: [PolicyLibraryController],
  exports: [TypeOrmModule],
})
export class PolicyLibraryModule {}
