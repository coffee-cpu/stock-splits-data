# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Community-maintained catalog of stock split data, optimized for client-side fetching via CDN (jsDelivr). Data is organized by year in individual JSON files.

## Development Commands

### Validation
```bash
npm install              # Install dependencies
npm run validate         # Validate all data files against JSON schemas
```

### Running Scripts Directly
```bash
npx ts-node scripts/validate.ts           # Validate data integrity
```

## Architecture

### Data Organization
- **Year files** (`data/YYYY.json`): Annual split data, validated against `schema/year-file.schema.json`
- **Schemas** (`schema/`): JSON schemas for validation using AJV

### Key Scripts

**scripts/validate.ts**
- Validates all year files against JSON schemas
- Checks date consistency (splits must be in correct year file)
- Detects duplicate splits across files (same symbol + date)
- Validates ISIN format and check digit, and ratio fields (positive integers, lowest terms, not 1:1)
- Enforces sort order (symbol, then date), no future split dates, and `updated` freshness

### Data Validation Rules

Year files must satisfy:
1. Schema compliance (split-entry.schema.json, year-file.schema.json)
2. Year in filename matches `year` field
3. All split dates fall within the file's year
4. No duplicate symbol+date combinations across all files
5. Valid ISIN (if present): 2 letters + 10 alphanumeric, valid check digit
6. Valid ratio fields: `ratioNew` and `ratioOld` positive integers in lowest terms, not equal
7. Splits sorted by symbol, then date (ordinal string compare)
8. No split dates in the future; `updated` not in the future and ≥ latest split date in the file

### Date Convention

`date` is the **first split-adjusted trading day (ex-date)** — not the record, payable or approval date. Record those in `notes`. Stock dividends under 25% use the normal ex-dividend date (usually the record date). Each listed share class (GOOG/GOOGL, HEI/HEI.A) gets its own entry.

### Scope

US-listed securities only (NASDAQ, NYSE, NYSE American, NYSE Arca, SEC-reporting OTC issuers), including ETFs/ETNs and ADSs. Exclude listings outside the US and their OTC grey-market tickers, freeze-out transactions, and splits that have not yet taken effect.

### Split Ratio Convention

Ratios use two integer fields, `ratioNew` and `ratioOld`:
- `ratioNew: 4, ratioOld: 1` = forward split (4 new shares per 1 old share)
- `ratioNew: 1, ratioOld: 10` = reverse split (1 new share per 10 old shares)
- `ratioNew: 3, ratioOld: 2` = fractional split

### GitHub Actions Workflows

**.github/workflows/validate-data.yml**
- Runs on every PR (required status check `validate` on main) and on pushes to main affecting data, schema, scripts or package files
- Runs `npm run validate` to ensure data integrity

## Contributing Workflow

When adding or correcting split data:
1. Edit the appropriate `data/YYYY.json` file
2. Update the `updated` field to current date (YYYY-MM-DD)
3. Run `npm run validate` to ensure data integrity
4. Commit changes

Required fields: `symbol`, `name`, `date`, `ratioNew`, `ratioOld`
Required (schema-enforced): `source` — must be a primary source URL
Recommended fields: `isin`, `exchange`
Optional fields: `notes`

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
- Aggregator websites as the `source` (StockTitan, TipRanks, Yahoo Finance, MarketScreener, Investing.com, etc.) — discovery only; link the original SEC filing, Nasdaq Trader alert, newswire release or company IR page

Using only original public records ensures no terms of service violations, highest data accuracy from primary sources, and legal compliance for all contributors and users. See CONTRIBUTING.md for detailed guidelines.
