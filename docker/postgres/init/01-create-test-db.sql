-- Runs once, on first container init (empty data directory), as the
-- POSTGRES_USER (adfactory) connected to POSTGRES_DB (adfactory_local).
--
-- adfactory_local is created automatically from POSTGRES_DB; this adds the
-- separate test database that PHPUnit uses (phpunit.xml -> DB_DATABASE=adfactory_test).
-- It is owned by the adfactory role, which matches .env.testing's DB_USERNAME.
CREATE DATABASE adfactory_test;
