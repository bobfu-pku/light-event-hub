-- Add verification_code column to event_registrations table if not exists
-- This will store the verification code for paid registrations

-- First, let's update the status flow for paid events
-- When user is approved, status becomes 'payment_pending'
-- After payment, status becomes 'paid' and verification_code is generated
-- When organizer scans the code, status becomes 'checked_in'

-- Add verification code generation logic
UPDATE event_registrations 
SET status = 'payment_pending' 
WHERE status = 'approved' 
AND event_id IN (
  SELECT id FROM events WHERE is_paid = true
);

-- Update existing paid registrations to have verification codes
UPDATE event_registrations 
SET verification_code = generate_verification_code()
WHERE status = 'paid' 
AND verification_code IS NULL;