# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Community-maintained catalog of stock split data, optimized for client-side fetching via CDN (jsDelivr). Data is organized by year in JSON files and compiled into a combined index for efficient lookups.

## Development Commands

### Build and Validation
```bash
npm install              # Install dependencies
npm run validate         # Validate all data files against JSON schemas
npm run build            # Generate data/index.json from year files
npm run precommit        # Run validation + build (recommended before commits)
```

### Running Scripts Directly
```bash
npx ts-node scripts/validate.ts           # Validate data integrity
npx ts-node scripts/build-index.ts        # Build combined index
```

## Architecture

### Data Organization
- **Year files** (`data/YYYY.json`): Annual split data, validated against `schema/year-file.schema.json`
- **Index file** (`data/index.json`): Auto-generated combined lookup optimized for CDN delivery
  - `bySymbol`: Maps ticker symbols to company info and split history
  - `byIsin`: Maps ISINs to ticker symbols
- **Schemas** (`schema/`): JSON schemas for validation using AJV

### Key Scripts

**scripts/validate.ts**
- Validates all year files against JSON schemas
- Checks date consistency (splits must be in correct year file)
- Detects duplicate splits across files (same symbol + date)
- Validates ISIN format (`/^[A-Z]{2}[A-Z0-9]{10}$/`) and ratio format (`/^\d+:\d+$/`)
- Validates index.json structure if it exists

**scripts/build-index.ts**
- Aggregates all year files into a single index.json
- Groups splits by symbol with chronological sorting (most recent first)
- Creates ISIN-to-symbol lookup map
- Updates version and timestamp metadata

### Data Validation Rules

Year files must satisfy:
1. Schema compliance (split-entry.schema.json, year-file.schema.json)
2. Year in filename matches `year` field
3. All split dates fall within the file's year
4. No duplicate symbol+date combinations across all files
5. Valid ISIN format (if present): 2 letters + 10 alphanumeric
6. Valid ratio format: `digits:digits` (e.g., "4:1", "1:10")

### Split Ratio Convention

Ratios are expressed as `new:old`:
- `4:1` = forward split (4 new shares per 1 old share)
- `1:10` = reverse split (1 new share per 10 old shares)
- `3:2` = fractional split

### GitHub Actions Workflows

**.github/workflows/validate-data.yml**
- Triggers on PRs and pushes to main affecting data/ or schema/
- Runs `npm run validate` to ensure data integrity

**.github/workflows/build-index.yml**
- Triggers on pushes to main affecting data/
- Runs `npm run build` and commits updated index.json

## Contributing Workflow

When adding or correcting split data:
1. Edit the appropriate `data/YYYY.json` file
2. Update the `updated` field to current date (YYYY-MM-DD)
3. Run `npm run precommit` to validate and rebuild index
4. Commit changes (validation runs automatically)
5. Index.json is auto-rebuilt by GitHub Actions on merge to main

Required fields: `symbol`, `name`, `date`, `ratio`
Recommended fields: `isin`, `exchange`
Optional fields: `source`, `verified`, `notes`

Always maintain alphabetical ordering of splits within year files and include source documentation in PRs.

## Data Source Policy

**IMPORTANT**: Only use publicly available sources that do not require API access or paid subscriptions.

**Acceptable Sources:**
- SEC EDGAR filings (8-K forms, proxy statements) - public domain
- Company investor relations pages - official press releases
- Exchange announcements - NYSE, NASDAQ corporate action notices

**Prohibited Sources:**
- Financial data APIs (Polygon.io, Massive, Alpha Vantage, etc.) - violates ToS
- Paid data services (Bloomberg Terminal, FactSet, etc.) - redistribution not permitted
- Aggregator websites without original source verification

Using only original public records ensures no terms of service violations, highest data accuracy from primary sources, and legal compliance for all contributors and users. See CONTRIBUTING.md for detailed guidelines.
