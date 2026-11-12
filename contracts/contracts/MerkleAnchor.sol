// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Registry of Merkle roots for AnchorProof (document epochs) and verifiable search
 * (index versions). Deliberately minimal to keep gas low (see docs/thesis-plan.md,
 * section 6): one storage write and one event per anchored root.
 *
 * Only the `indexer` (the service wallet of the backend) can add roots, so a root
 * in this contract is a root the service vouched for. Anyone can read it, which is
 * what lets a client verify a receipt without trusting the service.
 *
 * Use one deployment per stream (documents / index): versions are per contract.
 */
contract MerkleAnchor {
    struct Anchor {
        bytes32 root;
        uint64 timestamp;
    }

    mapping(uint256 => Anchor) public anchors; // version => Anchor
    uint256 public latestVersion;
    address public indexer; // address allowed to anchor

    event RootAnchored(uint256 indexed version, bytes32 root, uint64 timestamp);
    event IndexerChanged(address indexed previousIndexer, address indexed newIndexer);

    modifier onlyIndexer() {
        require(msg.sender == indexer, "not authorized");
        _;
    }

    constructor(address _indexer) {
        require(_indexer != address(0), "zero indexer");
        indexer = _indexer;
    }

    /// Anchors a new root and returns its version (1, 2, 3, ...).
    function anchorRoot(bytes32 root) external onlyIndexer returns (uint256 version) {
        // A zero root is how getRoot reports "no such version", so it can never be a real one.
        require(root != bytes32(0), "empty root");
        version = ++latestVersion;
        anchors[version] = Anchor(root, uint64(block.timestamp));
        emit RootAnchored(version, root, uint64(block.timestamp));
    }

    /// Returns (root, timestamp in seconds). An unknown version returns (0x0, 0).
    function getRoot(uint256 version) external view returns (bytes32, uint64) {
        Anchor memory a = anchors[version];
        return (a.root, a.timestamp);
    }

    /// Hands the right to anchor to another address (key rotation).
    function setIndexer(address newIndexer) external onlyIndexer {
        require(newIndexer != address(0), "zero indexer");
        emit IndexerChanged(indexer, newIndexer);
        indexer = newIndexer;
    }
}
