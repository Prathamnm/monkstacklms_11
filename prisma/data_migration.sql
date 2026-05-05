UPDATE employees SET "workEmail" = "email" WHERE "workEmail" IS NULL AND "email" IS NOT NULL;
