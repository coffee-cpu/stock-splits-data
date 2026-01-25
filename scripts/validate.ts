#!/usr/bin/env npx ts-node

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

interface ValidationResult {
  file: string;
  valid: boolean;
  errors: string[];
}

function loadSchema(name: string): object {
  const filepath = path.join(SCHEMA_DIR, name);
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

function getYearFiles(): string[] {
  const files = fs.readdirSync(DATA_DIR);
  return files.filter(f => /^\d{4}\.json$/.test(f)).sort();
}

function validateYearFiles(): ValidationResult[] {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const splitEntrySchema = loadSchema('split-entry.schema.json');
  const yearFileSchema = loadSchema('year-file.schema.json');

  // Add schemas to ajv
  ajv.addSchema(splitEntrySchema, 'split-entry.schema.json');
  const validate = ajv.compile(yearFileSchema);

  const results: ValidationResult[] = [];
  const yearFiles = getYearFiles();
  const allSplits: Array<{ symbol: string; date: string; file: string }> = [];

  for (const filename of yearFiles) {
    const filepath = path.join(DATA_DIR, filename);
    const content = fs.readFileSync(filepath, 'utf-8');
    const errors: string[] = [];

    let data: any;
    try {
      data = JSON.parse(content);
    } catch (e) {
      results.push({
        file: filename,
        valid: false,
        errors: [`Invalid JSON: ${(e as Error).message}`]
      });
      continue;
    }

    // Schema validation
    const valid = validate(data);
    if (!valid && validate.errors) {
      for (const err of validate.errors) {
        errors.push(`${err.instancePath} ${err.message}`);
      }
    }

    // Check count matches actual splits
    if (data.count !== data.splits?.length) {
      errors.push(`Count mismatch: declared ${data.count}, actual ${data.splits?.length || 0}`);
    }

    // Check year in filename matches year in data
    const filenameYear = parseInt(filename.replace('.json', ''), 10);
    if (data.year !== filenameYear) {
      errors.push(`Year mismatch: filename says ${filenameYear}, data says ${data.year}`);
    }

    // Check all split dates are in the correct year
    if (data.splits) {
      for (const split of data.splits) {
        const splitYear = parseInt(split.date.substring(0, 4), 10);
        if (splitYear !== data.year) {
          errors.push(`Split ${split.symbol} date ${split.date} is not in year ${data.year}`);
        }

        // Track for duplicate detection
        allSplits.push({
          symbol: split.symbol,
          date: split.date,
          file: filename
        });

        // Validate ISIN format if present
        if (split.isin && !/^[A-Z]{2}[A-Z0-9]{10}$/.test(split.isin)) {
          errors.push(`Invalid ISIN format for ${split.symbol}: ${split.isin}`);
        }

        // Validate ratio format
        if (!/^\d+:\d+$/.test(split.ratio)) {
          errors.push(`Invalid ratio format for ${split.symbol}: ${split.ratio}`);
        }
      }
    }

    results.push({
      file: filename,
      valid: errors.length === 0,
      errors
    });
  }

  // Check for duplicates across all files
  const seen = new Map<string, string>();
  for (const split of allSplits) {
    const key = `${split.symbol}:${split.date}`;
    if (seen.has(key)) {
      const existingFile = seen.get(key)!;
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

function validateIndex(): ValidationResult | null {
  const indexPath = path.join(DATA_DIR, 'index.json');
  if (!fs.existsSync(indexPath)) {
    return null;
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const indexSchema = loadSchema('index.schema.json');
  const validate = ajv.compile(indexSchema);

  const content = fs.readFileSync(indexPath, 'utf-8');
  const errors: string[] = [];

  let data: any;
  try {
    data = JSON.parse(content);
  } catch (e) {
    return {
      file: 'index.json',
      valid: false,
      errors: [`Invalid JSON: ${(e as Error).message}`]
    };
  }

  const valid = validate(data);
  if (!valid && validate.errors) {
    for (const err of validate.errors) {
      errors.push(`${err.instancePath} ${err.message}`);
    }
  }

  return {
    file: 'index.json',
    valid: errors.length === 0,
    errors
  };
}

function main(): void {
  console.log('Validating stock splits data...\n');

  const results = validateYearFiles();
  let hasErrors = false;

  console.log('Year files:');
  for (const result of results) {
    const status = result.valid ? '✓' : '✗';
    console.log(`  ${status} ${result.file}`);
    if (!result.valid) {
      hasErrors = true;
      for (const error of result.errors) {
        console.log(`      ${error}`);
      }
    }
  }

  const indexResult = validateIndex();
  if (indexResult) {
    console.log('\nIndex file:');
    const status = indexResult.valid ? '✓' : '✗';
    console.log(`  ${status} ${indexResult.file}`);
    if (!indexResult.valid) {
      hasErrors = true;
      for (const error of indexResult.errors) {
        console.log(`      ${error}`);
      }
    }
  } else {
    console.log('\nIndex file: not found (run build-index first)');
  }

  console.log('');
  if (hasErrors) {
    console.log('Validation failed!');
    process.exit(1);
  } else {
    console.log('All validations passed!');
  }
}

main();
