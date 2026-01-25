#!/usr/bin/env npx ts-node

/**
 * Fetch Stock Splits from Massive (formerly Polygon.io)
 *
 * API Docs: https://massive.com/docs/rest/stocks/corporate-actions/splits
 *
 * Usage:
 *   MASSIVE_API_KEY=xxx npx ts-node scripts/fetch-massive.ts [--days=14]
 */

import * as fs from 'fs';
import * as path from 'path';

const API_BASE = 'https://api.polygon.io';
const DATA_DIR = path.join(__dirname, '..', 'data');

interface MassiveSplit {
  ticker: string;
  execution_date: string;
  split_from: number;
  split_to: number;
}

interface MassiveResponse {
  status: string;
  results?: MassiveSplit[];
  next_url?: string;
}

interface SplitEntry {
  symbol: string;
  name: string;
  date: string;
  ratio: string;
  exchange?: string;
  source?: string;
}

interface YearFile {
  $schema: string;
  year: number;
  updated: string;
  splits: SplitEntry[];
}

function getApiKey(): string {
  const key = process.env.MASSIVE_API_KEY || process.env.POLYGON_API_KEY;
  if (!key) {
    console.error('Error: MASSIVE_API_KEY or POLYGON_API_KEY environment variable required');
    process.exit(1);
  }
  return key;
}

function parseArgs(): { days: number } {
  const args = process.argv.slice(2);
  let days = 14;

  for (const arg of args) {
    if (arg.startsWith('--days=')) {
      days = parseInt(arg.split('=')[1], 10);
    }
  }

  return { days };
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function fetchSplits(apiKey: string, fromDate: string, toDate: string): Promise<MassiveSplit[]> {
  const url = new URL(`${API_BASE}/v3/reference/splits`);
  url.searchParams.set('execution_date.gte', fromDate);
  url.searchParams.set('execution_date.lte', toDate);
  url.searchParams.set('limit', '1000');
  url.searchParams.set('order', 'desc');
  url.searchParams.set('apiKey', apiKey);

  console.log(`Fetching splits from ${fromDate} to ${toDate}...`);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data: MassiveResponse = await response.json();

  if (data.status !== 'OK') {
    throw new Error(`API returned status: ${data.status}`);
  }

  return data.results || [];
}

function loadExistingSplits(): Map<string, Set<string>> {
  const existing = new Map<string, Set<string>>();

  const files = fs.readdirSync(DATA_DIR).filter(f => /^\d{4}\.json$/.test(f));

  for (const filename of files) {
    const filepath = path.join(DATA_DIR, filename);
    const content = fs.readFileSync(filepath, 'utf-8');
    const yearData: YearFile = JSON.parse(content);

    for (const split of yearData.splits) {
      const key = `${split.symbol}:${split.date}`;
      if (!existing.has(split.symbol)) {
        existing.set(split.symbol, new Set());
      }
      existing.get(split.symbol)!.add(split.date);
    }
  }

  return existing;
}

function convertRatio(splitFrom: number, splitTo: number): string {
  return `${splitTo}:${splitFrom}`;
}

function filterNewSplits(apiSplits: MassiveSplit[], existing: Map<string, Set<string>>): MassiveSplit[] {
  return apiSplits.filter(split => {
    const symbolDates = existing.get(split.ticker);
    if (!symbolDates) return true;
    return !symbolDates.has(split.execution_date);
  });
}

function groupByYear(splits: MassiveSplit[]): Map<number, MassiveSplit[]> {
  const byYear = new Map<number, MassiveSplit[]>();

  for (const split of splits) {
    const year = parseInt(split.execution_date.substring(0, 4), 10);
    if (!byYear.has(year)) {
      byYear.set(year, []);
    }
    byYear.get(year)!.push(split);
  }

  return byYear;
}

function loadOrCreateYearFile(year: number): YearFile {
  const filepath = path.join(DATA_DIR, `${year}.json`);

  if (fs.existsSync(filepath)) {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  }

  return {
    $schema: '../schema/year-file.schema.json',
    year,
    updated: formatDate(new Date()),
    splits: []
  };
}

function saveYearFile(year: number, data: YearFile): void {
  const filepath = path.join(DATA_DIR, `${year}.json`);
  data.updated = formatDate(new Date());

  // Sort splits by date, then symbol
  data.splits.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.symbol.localeCompare(b.symbol);
  });

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n');
}

async function main(): Promise<void> {
  const apiKey = getApiKey();
  const { days } = parseArgs();

  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const apiSplits = await fetchSplits(
    apiKey,
    formatDate(fromDate),
    formatDate(toDate)
  );

  console.log(`Found ${apiSplits.length} splits from API`);

  if (apiSplits.length === 0) {
    console.log('No splits found in date range');
    return;
  }

  const existing = loadExistingSplits();
  const newSplits = filterNewSplits(apiSplits, existing);

  console.log(`New splits not in our data: ${newSplits.length}`);

  if (newSplits.length === 0) {
    console.log('No new splits to add');
    return;
  }

  // Group by year and add to files
  const byYear = groupByYear(newSplits);

  for (const [year, splits] of byYear) {
    const yearFile = loadOrCreateYearFile(year);

    for (const split of splits) {
      const entry: SplitEntry = {
        symbol: split.ticker,
        name: split.ticker, // Placeholder - will need manual update
        date: split.execution_date,
        ratio: convertRatio(split.split_from, split.split_to),
        source: 'massive'
      };

      yearFile.splits.push(entry);
      console.log(`  Added: ${entry.symbol} ${entry.date} ${entry.ratio}`);
    }

    saveYearFile(year, yearFile);
    console.log(`Updated ${year}.json`);
  }

  console.log('\nDone! New splits added. Review and update company names before committing.');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
