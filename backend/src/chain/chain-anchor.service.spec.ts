import { ConfigService } from '@nestjs/config';
import { ChainAnchorService } from './chain-anchor.service';

const config = (values: Record<string, string>) => new ConfigService(values);

describe('ChainAnchorService', () => {
  it('is off, and reports the demo registry, until it is fully configured', () => {
    const service = new ChainAnchorService(config({}));
    expect(service.enabled).toBe(false);
    expect(service.info()).toEqual({ enabled: false, network: 'mock', chainId: null, contract: null, explorer: null });
  });

  it('stays off when a part is missing (no key)', () => {
    const service = new ChainAnchorService(
      config({ ANCHOR_CHAIN_ID: '80002', ANCHOR_CONTRACT_DOCUMENTS: '0x' + '11'.repeat(20) }),
    );
    expect(service.enabled).toBe(false);
  });

  it('stays off for an invalid contract address', () => {
    const service = new ChainAnchorService(
      config({ ANCHOR_CHAIN_ID: '80002', ANCHOR_CONTRACT_DOCUMENTS: 'not-an-address', ANCHOR_PRIVATE_KEY: '0x' + '22'.repeat(32) }),
    );
    expect(service.enabled).toBe(false);
  });

  it('turns on with chain id, contract and key, and names the network', () => {
    const contract = '0x' + '11'.repeat(20);
    const service = new ChainAnchorService(
      config({ ANCHOR_CHAIN_ID: '80002', ANCHOR_CONTRACT_DOCUMENTS: contract, ANCHOR_PRIVATE_KEY: '0x' + '22'.repeat(32) }),
    );
    expect(service.enabled).toBe(true);
    expect(service.network).toBe('polygon-amoy');
    expect(service.info()).toEqual({
      enabled: true,
      network: 'polygon-amoy',
      chainId: 80002,
      contract,
      explorer: 'https://amoy.polygonscan.com',
    });
  });

  it('cannot anchor while off', async () => {
    const service = new ChainAnchorService(config({}));
    await expect(service.anchorRoot('0x' + 'aa'.repeat(32))).rejects.toThrow('not configured');
    expect(await service.getRoot(1)).toBeNull();
  });
});
