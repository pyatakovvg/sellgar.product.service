import { existsSync } from 'node:fs';
import { DataSource } from 'typeorm';

import { databaseOptions } from './database.options';

if (existsSync('.env')) process.loadEnvFile('.env');

export default new DataSource(databaseOptions(process.env));
