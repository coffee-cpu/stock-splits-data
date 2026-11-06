# Stock Splits Data

[![Validate Data](https://github.com/coffee-cpu/stock-splits-data/actions/workflows/validate-data.yml/badge.svg)](https://github.com/coffee-cpu/stock-splits-data/actions/workflows/validate-data.yml)

Community-maintained catalog of stock split data, optimized for client-side fetching via CDN.

## ⚠️ Disclaimer

**This data is provided for informational purposes only.**

- **Not Financial Advice**: This data should not be used as the sole basis for tax calculations, investment decisions, or financial planning.
- **Community-Maintained**: Data is contributed by the community and may contain errors or omissions.
- **Verify Before Use**: Always verify split information against official sources (SEC filings, company announcements) before relying on it for important decisions.
- **No Warranty**: We make no guarantees about the accuracy, completeness, or timeliness of this data.
- **Tax Guidance**: For capital gains tax calculations, consult a qualified tax professional and verify all split data with official records.

**Use at your own risk.**

## Overview

This repository provides historical stock split data in a structured JSON format, designed for:
- Capital gains tax (CGT) calculations
- Portfolio tracking applications
- Financial analysis tools

Data is organized by year in individual JSON files.

## Coverage & Scope

**This dataset is not exhaustive.** Check coverage before relying on it — a split that is missing here produces a silently wrong cost basis.

| Years | Coverage |
|-------|----------|
| 2015–2023 | Notable forward splits of well-known US companies; very few reverse splits |
| 2024–2025 | Broader: major forward splits plus a sample of reverse splits |
| 2026 | Systematic (forward and reverse) for January–March only |

- **In scope:** securities listed in the US (NASDAQ, NYSE, NYSE American, NYSE Arca, OTC issuers that file with the SEC), including ETFs/ETNs and ADSs. Each listed share class gets its own entry (e.g. `GOOG` and `GOOGL`).
- **Out of scope:** listings outside the US and their OTC grey-market tickers, and freeze-out (reverse/forward) transactions.
- **Symbols are as of the split date.** Tickers that later changed (e.g. `CTRP` → `TCOM`, `NYCB` → `FLG`) are not remapped, so match on `isin` where available.

## CDN Usage

Fetch data directly via jsDelivr CDN - no API key required:

```javascript
// Fetch splits for a specific year
const response = await fetch(
  'https://cdn.jsdelivr.net/gh/coffee-cpu/stock-splits-data@main/data/2024.json'
);
const data = await response.json();

// Access the splits array
console.log(data.splits);
// [
//   {
//     symbol: "NVDA",
//     name: "NVIDIA Corporation",
//     date: "2024-06-10",
//     ratioNew: 10,
//     ratioOld: 1,
//     isin: "US67066G1040",
//     exchange: "NASDAQ"
//   },
//   ...
// ]

// Find splits for a specific symbol
const nvdaSplits = data.splits.filter(s => s.symbol === 'NVDA');
```

### TypeScript Types

```typescript
interface SplitEntry {
  symbol: string;
  name: string;
  date: string;      // YYYY-MM-DD, first split-adjusted trading day (ex-date)
  ratioNew: number;  // New shares received (e.g., 4 in a 4-for-1 split)
  ratioOld: number;  // Old shares exchanged (e.g., 1 in a 4-for-1 split)
  isin?: string;
  exchange?: string;
  source: string;    // URL to primary source (SEC filing, exchange notice, press release)
  notes?: string;
}

interface YearFile {
  $schema: string;
  year: number;
  updated: string;   // YYYY-MM-DD
  splits: SplitEntry[];
}
```

### Fetching Multiple Years

```javascript
const BASE = 'https://cdn.jsdelivr.net/gh/coffee-cpu/stock-splits-data@main/data';

// Fetch splits for multiple years. Years without a data file are skipped.
async function getSplitsForYears(years) {
  const results = await Promise.all(
    years.map(async year => {
      const res = await fetch(`${BASE}/${year}.json`);
      return res.ok ? (await res.json()).splits : [];
    })
  );
  return results.flat();
}

// Example: Get all splits from 2015 to the current year
const years = [];
for (let y = 2015; y <= new Date().getFullYear(); y++) years.push(y);
const allSplits = await getSplitsForYears(years);
```

To list available year files programmatically, use the jsDelivr API:
`https://data.jsdelivr.com/v1/packages/gh/coffee-cpu/stock-splits-data@main?structure=flat`.

`@main` always serves the latest data, and jsDelivr may cache it for several hours.

## Data Structure

```
data/
├── 2015.json       # Earliest year currently covered
├── ...
├── 2025.json
└── 2026.json       # Current year
```

### Year File Format

```json
{
  "$schema": "../schema/year-file.schema.json",
  "year": 2024,
  "updated": "2026-11-06",
  "splits": [
    {
      "symbol": "NVDA",
      "name": "NVIDIA Corporation",
      "date": "2024-06-10",
      "ratioNew": 10,
      "ratioOld": 1,
      "isin": "US67066G1040",
      "exchange": "NASDAQ"
    }
  ]
}
```

### Split Ratio Format

Ratios use two integer fields, `ratioNew` (new shares received) and `ratioOld` (old shares exchanged):
- `ratioNew: 4, ratioOld: 1` = 4 new shares for every 1 old share (forward split)
- `ratioNew: 1, ratioOld: 10` = 1 new share for every 10 old shares (reverse split)
- `ratioNew: 3, ratioOld: 2` = 3 new shares for every 2 old shares

### Date Convention

`date` is the **first trading day on a split-adjusted basis** (the ex-date). Shares acquired *before* this date are pre-split. Shares acquired *on or after* it are already post-split. Record, payable and board-approval dates are kept in `notes`.

## Calculating Adjusted Cost Basis

```javascript
async function adjustForSplits(purchaseDate, symbol, originalShares, originalCost) {
  // Fetch every year from the purchase year onward (cache these in real code)
  const years = [];
  for (let y = Number(purchaseDate.slice(0, 4)); y <= new Date().getFullYear(); y++) years.push(y);
  const allSplits = await getSplitsForYears(years);

  // Splits whose ex-date is after the purchase date affect the position
  const relevantSplits = allSplits
    .filter(s => s.symbol === symbol && s.date > purchaseDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  let adjustedShares = originalShares;

  for (const split of relevantSplits) {
    const multiplier = split.ratioNew / split.ratioOld;
    adjustedShares *= multiplier;
    // Cost basis stays the same, but cost per share decreases
  }

  return {
    shares: adjustedShares,
    costPerShare: originalCost / adjustedShares
  };
}

// Example: 10 shares of NVDA bought on 2020-01-02 for $2,400 total
const result = await adjustForSplits('2020-01-02', 'NVDA', 10, 2400);
// After 4:1 (2021-07-20) and 10:1 (2024-06-10) splits: 400 shares, $6.00/share
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding or correcting split data.

## Data Sources

All data is sourced exclusively from publicly available records:

- **SEC EDGAR filings**: Form 8-K corporate action announcements (public domain)
- **Company investor relations**: Official press releases and announcements
- **Exchange notices**: NYSE and NASDAQ corporate action calendars
- **Verification**: All entries must link to verifiable public sources

**Note**: We do not use financial data APIs or paid services to ensure legal compliance and data integrity. See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed source requirements.

## License

MIT License - see [LICENSE](LICENSE) for details.
