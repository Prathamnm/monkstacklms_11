UPDATE "Employee" 
SET "joinDate" = '2026-01-01'::timestamp 
WHERE email LIKE '%monkajad%' OR displayName LIKE '%monika%';

UPDATE "LeaveBalance"
SET "standardTotal" = 18, "emergencyTotal" = 2
WHERE "employeeId" IN (
  SELECT id FROM "Employee" WHERE email LIKE '%monkajad%' OR displayName LIKE '%monika%'
);

SELECT id, email, "joinDate", "displayName" FROM "Employee" ORDER BY "createdAt" DESC LIMIT 10;
SELECT * FROM "LeaveBalance";
