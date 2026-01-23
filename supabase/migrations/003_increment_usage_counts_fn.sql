-- Function to increment usage_count for multiple categories
CREATE OR REPLACE FUNCTION increment_usage_counts(category_ids UUID[])
RETURNS VOID AS $$
BEGIN
  UPDATE categories
  SET usage_count = COALESCE(usage_count, 0) + 1
  WHERE id = ANY(category_ids);
END;
$$ LANGUAGE plpgsql;
