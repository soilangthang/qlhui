-- Performance indexes for hot HuiOpening query paths.
-- Safe, additive change: no schema behavior change.

-- Used by latest opening lookups/sorts per line.
CREATE INDEX IF NOT EXISTS "HuiOpening_huiLineId_ngayKhui_idx"
ON "HuiOpening"("huiLineId", "ngayKhui" DESC);

-- Used by payment queue pages that filter by status and sort by ngayKhui.
CREATE INDEX IF NOT EXISTS "HuiOpening_status_ngayKhui_idx"
ON "HuiOpening"("status", "ngayKhui" DESC);
