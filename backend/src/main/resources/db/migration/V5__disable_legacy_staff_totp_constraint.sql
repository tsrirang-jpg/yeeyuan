DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'app_user'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%totp_secret_ciphertext%'
    LOOP
        EXECUTE format('ALTER TABLE app_user DROP CONSTRAINT %I', constraint_name);
    END LOOP;
END $$;
