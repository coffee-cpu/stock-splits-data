#!/usr/bin/env npx ts-node

/**
 * Build Index Script
 * Generates data/index.json from all yearly data files.
 * This combined index is optimized for client-side lookups via CDN.
 */

import * as fs from 'fs';
import * as path from 'path';

interface SplitEntry {
  symbol: string;
  name: string;
  date: string;
  ratio: string;
  isin?: string;
  exchange?: string;
  source?: string;
  verified?: boolean;
  notes?: string;
}

interface YearFile {
  $schema: string;
  year: number;
  updated: string;
  count: number;
  splits: SplitEntry[];
}

interface SymbolData {
  name: string;
  isin?: string;
  exchange?: string;
  splits: Array<{
    date: string;
    ratio: string;
    notes?: string;
  }>;
}

interface IndexFile {
  $schema: string;
  version: string;
  updated: string;
  totalSplits: number;
  years: number[];
  bySymbol: Record<string, SymbolData>;
  byIsin: Record<string, string>;
}

const DATA_DIR = path.join(__dirname, '..', 'data');
const INDEX_PATH = path.join(DATA_DIR, 'index.json');
const VERSION = '1.0.0';

function getYearFiles(): string[] {
  const files = fs.readdirSync(DATA_DIR);
  return files
    .filter(f => /^\d{4}\.json$/.test(f))
    .sort();
}

function loadYearFile(filename: string): YearFile {
  const filepath = path.join(DATA_DIR, filename);
  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content);
}

function buildIndex(): void {
  const yearFiles = getYearFiles();
  const years: number[] = [];
  const bySymbol: Record<string, SymbolData> = {};
  const byIsin: Record<string, string> = {};
  let totalSplits = 0;

  console.log(`Processing ${yearFiles.length} year files...`);

  for (const filename of yearFiles) {
    const yearData = loadYearFile(filename);
    years.push(yearData.year);
    totalSplits += yearData.splits.length;

    console.log(`  ${yearData.year}: ${yearData.splits.length} splits`);

    for (const split of yearData.splits) {
      // Build bySymbol index
      if (!bySymbol[split.symbol]) {
        bySymbol[split.symbol] = {
          name: split.name,
          isin: split.isin,
          exchange: split.exchange,
          splits: []
        };
      }

      bySymbol[split.symbol].splits.push({
        date: split.date,
        ratio: split.ratio,
        ...(split.notes && { notes: split.notes })
      });

      // Build byIsin index
      if (split.isin) {
        byIsin[split.isin] = split.symbol;
      }
    }
  }

  // Sort splits by date (descending - most recent first) for each symbol
  for (const symbol of Object.keys(bySymbol)) {
    bySymbol[symbol].splits.sort((a, b) => b.date.localeCompare(a.date));
  }

  const today = new Date().toISOString().split('T')[0];

  const index: IndexFile = {
    $schema: '../schema/index.schema.json',
    version: VERSION,
    updated: today,
    totalSplits,
    years: years.sort((a, b) => a - b),
    bySymbol,
    byIsin
  };

  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + '\n');

  console.log(`\nGenerated index.json:`);
  console.log(`  Total splits: ${totalSplits}`);
  console.log(`  Symbols: ${Object.keys(bySymbol).length}`);
  console.log(`  Years: ${years.length} (${Math.min(...years)}-${Math.max(...years)})`);
}

buildIndex();
