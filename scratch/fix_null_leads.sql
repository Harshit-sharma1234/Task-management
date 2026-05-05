
UPDATE projects 
SET lead_id = created_by 
WHERE lead_id IS NULL;
