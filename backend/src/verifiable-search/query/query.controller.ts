import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { QueryService } from './query.service';
import { VerifiableSearchDto } from './query.dto';

/**
 * REST controller — see docs/tech-stack.md: this module is exposed the same
 * way AnchorProof's public API is (POST /anchor, GET /verify/:id).
 */
@Controller('verifiable-search')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  @Post('search')
  search(@Body() dto: VerifiableSearchDto) {
    return this.queryService.search(dto);
  }

  /** Latest anchored index version: clients reject answers from older ones (rollback). */
  @Get('latest')
  getLatest() {
    const anchor = this.queryService.getLatestAnchor();
    if (!anchor) {
      throw new NotFoundException('No index anchored yet');
    }
    return anchor;
  }

  /** Stands in for reading MerkleAnchor.sol via an RPC/indexer once the
   * contract is actually deployed (see AnchoringService). */
  @Get('root/:version')
  getRoot(@Param('version') version: string) {
    const anchor = this.queryService.getAnchor(Number(version));
    if (!anchor) {
      throw new NotFoundException('No anchor for this index version');
    }
    return anchor;
  }
}
