import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { getAddress, zeroAddress } from "viem";

const ROOT_A = "0x" + "aa".repeat(32);
const ROOT_B = "0x" + "bb".repeat(32);

describe("MerkleAnchor", () => {
  async function deploy() {
    const [indexer, stranger] = await hre.viem.getWalletClients();
    const anchor = await hre.viem.deployContract("MerkleAnchor", [indexer.account.address]);
    const publicClient = await hre.viem.getPublicClient();
    return { anchor, indexer, stranger, publicClient };
  }

  it("starts empty, owned by the indexer", async () => {
    const { anchor, indexer } = await loadFixture(deploy);
    expect(await anchor.read.latestVersion()).to.equal(0n);
    expect(getAddress(await anchor.read.indexer())).to.equal(getAddress(indexer.account.address));
  });

  it("anchors roots with consecutive versions and reads them back", async () => {
    const { anchor, publicClient } = await loadFixture(deploy);

    const tx1 = await anchor.write.anchorRoot([ROOT_A]);
    const tx2 = await anchor.write.anchorRoot([ROOT_B]);
    const block = await publicClient.getBlock();

    expect(await anchor.read.latestVersion()).to.equal(2n);
    const [root1, ts1] = await anchor.read.getRoot([1n]);
    const [root2] = await anchor.read.getRoot([2n]);
    expect(root1).to.equal(ROOT_A);
    expect(root2).to.equal(ROOT_B);
    expect(ts1 > 0n).to.equal(true);
    expect(Number(ts1)).to.be.lessThanOrEqual(Number(block.timestamp));
    expect(tx1).to.not.equal(tx2);
  });

  it("emits RootAnchored with the version and root", async () => {
    const { anchor, publicClient } = await loadFixture(deploy);
    const hash = await anchor.write.anchorRoot([ROOT_A]);
    await publicClient.waitForTransactionReceipt({ hash });
    const events = await anchor.getEvents.RootAnchored();
    expect(events).to.have.lengthOf(1);
    expect(events[0].args.version).to.equal(1n);
    expect(events[0].args.root).to.equal(ROOT_A);
  });

  it("reports an unknown version as an empty root", async () => {
    const { anchor } = await loadFixture(deploy);
    const [root, ts] = await anchor.read.getRoot([42n]);
    expect(root).to.equal("0x" + "00".repeat(32));
    expect(ts).to.equal(0n);
  });

  it("refuses a zero root and a stranger", async () => {
    const { anchor, stranger } = await loadFixture(deploy);
    await expect(anchor.write.anchorRoot(["0x" + "00".repeat(32)])).to.be.rejectedWith("empty root");

    const asStranger = await hre.viem.getContractAt("MerkleAnchor", anchor.address, { client: { wallet: stranger } });
    await expect(asStranger.write.anchorRoot([ROOT_A])).to.be.rejectedWith("not authorized");
    expect(await anchor.read.latestVersion()).to.equal(0n);
  });

  it("lets the indexer hand over the right to anchor", async () => {
    const { anchor, stranger } = await loadFixture(deploy);
    await anchor.write.setIndexer([stranger.account.address]);

    const asStranger = await hre.viem.getContractAt("MerkleAnchor", anchor.address, { client: { wallet: stranger } });
    await asStranger.write.anchorRoot([ROOT_A]); // now allowed
    await expect(anchor.write.anchorRoot([ROOT_B])).to.be.rejectedWith("not authorized"); // old indexer is not
    await expect(asStranger.write.setIndexer([zeroAddress])).to.be.rejectedWith("zero indexer");
  });
});
