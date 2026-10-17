import { readFile } from 'node:fs/promises';
import { validateMarketData } from '../public/data-contract.js';
const data = validateMarketData(JSON.parse(await readFile(new URL('../public/data/market-daily.json', import.meta.url), 'utf8')));
console.log(`Validated ${data.rows.length} daily records (${data.isSample ? 'sample' : 'live'}).`);
