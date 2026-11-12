-- Which registry holds a record's batch root: the demo ("mock") one or a real chain.
--
-- Epoch numbers are per registry (the mock one and each contract count from 1), so a receipt
-- has to say where its epoch lives. Existing records were all anchored in the mock registry.

ALTER TABLE "AnchorRecord" ADD COLUMN IF NOT EXISTS "network" VARCHAR(32) NOT NULL DEFAULT 'mock';
-- Address of the MerkleAnchor contract for on-chain records; NULL for the mock registry.
ALTER TABLE "AnchorRecord" ADD COLUMN IF NOT EXISTS "contract" VARCHAR(42);
