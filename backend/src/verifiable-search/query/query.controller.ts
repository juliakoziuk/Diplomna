import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { QueryService } from './query.service';
import { VerifiableSearchDto } from './query.dto';
import { AnchorRootDto, ErrorResponse, SearchResponseDto } from '../../docs/api-models';

/**
 * REST controller — see docs/tech-stack.md: this module is exposed the same
 * way AnchorProof's public API is (POST /anchor, GET /verify/:id).
 */
@ApiTags('Verifiable search')
@Controller('verifiable-search')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  @Post('search')
  @ApiOperation({
    summary: 'Authenticated vector search',
    description:
      'IVF search over the demo corpus that returns the top-k results together with a Merkle proof bundle ' +
      '(protocol ivf-ring-v2). The client verifies it with the verification-sdk and rejects a server that ' +
      'hid a better document, swapped clusters, tampered with a vector or rolled the index back.',
  })
  @ApiOkResponse({ type: SearchResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid parameters, or `attack` used in production.',
    type: ErrorResponse,
  })
  search(@Body() dto: VerifiableSearchDto) {
    return this.queryService.search(dto);
  }

  /** Latest anchored index version: clients reject answers from older ones (rollback). */
  @Get('latest')
  @ApiOperation({
    summary: 'Latest anchored index version',
    description: 'Clients reject answers built on an older version (rollback protection).',
  })
  @ApiOkResponse({ type: AnchorRootDto })
  @ApiNotFoundResponse({ description: 'No index anchored yet.', type: ErrorResponse })
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
  @ApiOperation({ summary: 'Anchored root of an index version' })
  @ApiParam({ name: 'version', type: Number, example: 2 })
  @ApiOkResponse({ type: AnchorRootDto })
  @ApiNotFoundResponse({ description: 'No anchor for this index version.', type: ErrorResponse })
  getRoot(@Param('version') version: string) {
    const anchor = this.queryService.getAnchor(Number(version));
    if (!anchor) {
      throw new NotFoundException('No anchor for this index version');
    }
    return anchor;
  }
}
