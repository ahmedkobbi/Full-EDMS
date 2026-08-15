-- Smart EDMS — Dev database initialization
-- Creates the licensing server database alongside the on-premise backend database.

CREATE DATABASE smart_edms_license;
GRANT ALL PRIVILEGES ON DATABASE smart_edms_license TO smart_edms;
