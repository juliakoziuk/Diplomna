import { Module } from '@nestjs/common';
import { ChainAnchorService } from './chain-anchor.service';

@Module({
  providers: [ChainAnchorService],
  exports: [ChainAnchorService],
})
export class ChainModule {}
