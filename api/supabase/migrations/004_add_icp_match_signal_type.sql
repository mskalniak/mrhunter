-- Add icp_match to the allowed signal_type values
ALTER TABLE signals DROP CONSTRAINT IF EXISTS signals_signal_type_check;
ALTER TABLE signals ADD CONSTRAINT signals_signal_type_check
  CHECK (signal_type IN ('hiring', 'pain_point', 'competitor_engagement', 'funding', 'role_change', 'event', 'icp_match'));
