import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { JwtService } from '@nestjs/jwt';
import { BillingModule } from 'src/billing/billing.module';
import { VerifiableSearchModule } from 'src/verifiable-search/verifiable-search.module';
import { AnchorEpoch, AnchorRecord, ApiKey } from './anchor.models';
import { AnchorApiService } from './anchor-api.service';
import { AccountController, AnchorApiController, PublicChainController, PublicRootsController } from './anchor-api.controller';
import { ChainModule } from 'src/chain/chain.module';

@Module({
  imports: [SequelizeModule.forFeature([AnchorRecord, ApiKey, AnchorEpoch]), BillingModule, VerifiableSearchModule, ChainModule],
  controllers: [AnchorApiController, AccountController, PublicRootsController, PublicChainController],
  providers: [AnchorApiService, JwtService],
})
export class AnchorApiModule {}
