-- Persist the registry of anchored batch roots.
--
-- Until now the roots lived only in the server's memory (the mock registry) and the
-- epoch counter restarted at 1 after every restart, so a receipt could no longer be
-- verified and different runs reused the same epoch number for different roots.
-- With this table the registry survives restarts and numbering continues.

CREATE TABLE IF NOT EXISTS "AnchorEpoch" (
  "version"   INTEGER PRIMARY KEY,
  "root"      VARCHAR(66) NOT NULL,
  "txHash"    VARCHAR(66) NOT NULL,
  -- milliseconds since the Unix epoch, as returned by the mock registry
  "timestamp" BIGINT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backfill from receipts that were already issued. Old runs reused epoch numbers, so
-- when several roots claim the same epoch the most recently anchored one wins.
INSERT INTO "AnchorEpoch" ("version", "root", "txHash", "timestamp")
SELECT DISTINCT ON ("epoch")
  "epoch", "batchRoot", "txHash", (EXTRACT(EPOCH FROM "anchoredAt") * 1000)::BIGINT
FROM "AnchorRecord"
WHERE "status" = 'anchored'
  AND "epoch" IS NOT NULL
  AND "batchRoot" IS NOT NULL
  AND "txHash" IS NOT NULL
  AND "anchoredAt" IS NOT NULL
ORDER BY "epoch", "anchoredAt" DESC
ON CONFLICT ("version") DO NOTHING;
