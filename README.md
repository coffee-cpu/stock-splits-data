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
  date: string;      // YYYY-MM-DD
  ratioNew: number;  // New shares received (e.g., 4 in a 4-for-1 split)
  ratioOld: number;  // Old shares exchanged (e.g., 1 in a 4-for-1 split)
  isin?: string;
  exchange?: string;
  source?: string;   // URL to SEC filing or press release
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
// Fetch splits for multiple years
async function getSplitsForYears(years) {
  const promises = years.map(year =>
    fetch(`https://cdn.jsdelivr.net/gh/coffee-cpu/stock-splits-data@main/data/${year}.json`)
      .then(res => res.json())
  );
  const results = await Promise.all(promises);
  return results.flatMap(data => data.splits);
}

// Example: Get all splits from 2020-2025
const allSplits = await getSplitsForYears([2020, 2021, 2022, 2024, 2025]);
```

## Data Structure

```
data/
├── 2020.json       # Splits from 2020
├── 2021.json       # Splits from 2021
├── 2022.json       # Splits from 2022
├── 2024.json       # Splits from 2024
├── 2025.json       # Splits from 2025
└── ...             # Additional years
```

### Year File Format

```json
{
  "$schema": "../schema/year-file.schema.json",
  "year": 2024,
  "updated": "2025-01-25",
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

## Calculating Adjusted Cost Basis

```javascript
async function adjustForSplits(purchaseDate, symbol, originalShares, originalCost) {
  // Fetch all year files (you might want to cache these)
  const years = [2014, 2015, 2020, 2021, 2022, 2024, 2025]; // Add all relevant years
  const allSplits = await getSplitsForYears(years);

  // Filter splits for this symbol that occurred after purchase
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

// Example: 10 shares of AAPL bought on 2010-01-01 for $200
const result = await adjustForSplits('2010-01-01', 'AAPL', 10, 200);
// After 7:1 (2014) and 4:1 (2020) splits: 280 shares, $0.71/share
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
