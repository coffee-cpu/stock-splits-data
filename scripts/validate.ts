#!/usr/bin/env ts-node

/**
 * Validate Script
 * Validates all data files against JSON schemas and checks for data integrity.
 */

import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const DATA_DIR = path.join(__dirname, '..', 'data');
const SCHEMA_DIR = path.join(__dirname, '..', 'schema');
const SCHEMA_REF = '../schema/year-file.schema.json';

interface ValidationResult {
  file: string;
  valid: boolean;
  errors: string[];
}

interface Split {
  symbol: string;
  date: string;
  ratioNew: number;
  ratioOld: number;
  isin?: string;
}

function loadSchema(name: string): object {
  const filepath = path.join(SCHEMA_DIR, name);
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

function getYearFiles(): string[] {
  const files = fs.readdirSync(DATA_DIR);
  return files.filter(f => /^\d{4}\.json$/.test(f)).sort();
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** ISIN check digit (ISO 6166): letters -> numbers, then Luhn over the digit string. */
function isinChecksumValid(isin: string): boolean {
  const digits = isin
    .split('')
    .map(c => (/[A-Z]/.test(c) ? (c.charCodeAt(0) - 55).toString() : c))
    .join('');
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Ordinal (code-point) comparison so ordering is locale-independent. */
function compareSplits(a: Split, b: Split): number {
  if (a.symbol !== b.symbol) return a.symbol < b.symbol ? -1 : 1;
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return 0;
}

function validateYearFiles(): ValidationResult[] {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  ajv.addSchema(loadSchema('split-entry.schema.json'), 'split-entry.schema.json');
  const validate = ajv.compile(loadSchema('year-file.schema.json'));

  const today = todayUtc();
  const results: ValidationResult[] = [];
  const allSplits: Array<{ symbol: string; date: string; file: string }> = [];

  for (const filename of getYearFiles()) {
    const content = fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8');
    const errors: string[] = [];

    let data: any;
    try {
      data = JSON.parse(content);
    } catch (e) {
      results.push({ file: filename, valid: false, errors: [`Invalid JSON: ${(e as Error).message}`] });
      continue;
    }

    // Schema validation (covers required fields, ISIN pattern, positive-integer ratios, date format)
    if (!validate(data) && validate.errors) {
      for (const err of validate.errors) {
        errors.push(`${err.instancePath || '/'} ${err.message}`);
      }
    }

    if (data.$schema !== SCHEMA_REF) {
      errors.push(`$schema must be "${SCHEMA_REF}", got "${data.$schema}"`);
    }

    const filenameYear = parseInt(filename.replace('.json', ''), 10);
    if (data.year !== filenameYear) {
      errors.push(`Year mismatch: filename says ${filenameYear}, data says ${data.year}`);
    }

    if (typeof data.updated === 'string' && data.updated > today) {
      errors.push(`"updated" (${data.updated}) is in the future`);
    }

    const splits: Split[] = Array.isArray(data.splits) ? data.splits : [];
    let latestDate = '';

    splits.forEach((split, i) => {
      const label = `${split.symbol} ${split.date}`;

      if (typeof split.date === 'string') {
        if (parseInt(split.date.substring(0, 4), 10) !== data.year) {
          errors.push(`${label}: date is not in year ${data.year}`);
        }
        if (split.date > today) {
          errors.push(`${label}: date is in the future (only add splits that have taken effect)`);
        }
        if (split.date > latestDate) latestDate = split.date;
      }

      if (Number.isInteger(split.ratioNew) && Number.isInteger(split.ratioOld) && split.ratioNew > 0 && split.ratioOld > 0) {
        if (split.ratioNew === split.ratioOld) {
          errors.push(`${label}: ratioNew equals ratioOld (${split.ratioNew}:${split.ratioOld}) — not a split`);
        } else if (gcd(split.ratioNew, split.ratioOld) !== 1) {
          errors.push(`${label}: ratio ${split.ratioNew}:${split.ratioOld} is not in lowest terms`);
        }
      }

      if (split.isin && /^[A-Z]{2}[A-Z0-9]{10}$/.test(split.isin) && !isinChecksumValid(split.isin)) {
        errors.push(`${label}: ISIN ${split.isin} has an invalid check digit`);
      }

      if (i > 0 && compareSplits(splits[i - 1], split) > 0) {
        errors.push(`${label}: out of order (must be sorted by symbol, then date; follows ${splits[i - 1].symbol} ${splits[i - 1].date})`);
      }

      allSplits.push({ symbol: split.symbol, date: split.date, file: filename });
    });

    if (latestDate && typeof data.updated === 'string' && data.updated < latestDate) {
      errors.push(`"updated" (${data.updated}) is earlier than the latest split date (${latestDate})`);
    }

    results.push({ file: filename, valid: errors.length === 0, errors });
  }

  // Duplicates across all files (same symbol + date)
  const seen = new Map<string, string>();
  for (const split of allSplits) {
    const key = `${split.symbol}:${split.date}`;
    const existingFile = seen.get(key);
    if (existingFile) {
      const result = results.find(r => r.file === split.file);
      if (result) {
        result.valid = false;
        result.errors.push(`Duplicate split: ${split.symbol} on ${split.date} also in ${existingFile}`);
      }
    } else {
      seen.set(key, split.file);
    }
  }

  return results;
}

function main(): void {
  console.log('Validating stock splits data...\n');

  const results = validateYearFiles();
  let hasErrors = false;

  console.log('Year files:');
  for (const result of results) {
    console.log(`  ${result.valid ? '✓' : '✗'} ${result.file}`);
    if (!result.valid) {
      hasErrors = true;
      for (const error of result.errors) {
        console.log(`      ${error}`);
      }
    }
  }

  console.log('');
  if (hasErrors) {
    console.log('Validation failed!');
    process.exit(1);
  }
  console.log('All validations passed!');
}

main();
