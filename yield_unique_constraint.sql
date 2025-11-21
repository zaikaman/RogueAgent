-- Add unique constraint to pool_id to prevent duplicates
ALTER TABLE yield_opportunities ADD CONSTRAINT yield_opportunities_pool_id_key UNIQUE (pool_id);
