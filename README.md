# Stock Splits Data

Community-maintained catalog of stock split data, optimized for client-side fetching via CDN.

## Overview

This repository provides historical stock split data in a structured JSON format, designed for:
- Capital gains tax (CGT) calculations
- Portfolio tracking applications
- Financial analysis tools

Data is organized by year and compiled into a combined index for efficient lookups.

## CDN Usage

Fetch data directly via jsDelivr CDN - no API key required:

### Combined Index (Recommended)

```javascript
// Fetch the combined index with all splits organized by symbol
const response = await fetch(
  'https://cdn.jsdelivr.net/gh/coffee-cpu/stock-splits-data@main/data/index.json'
);
const data = await response.json();

// Look up splits by symbol
const appleSplits = data.bySymbol['AAPL'];
console.log(appleSplits);
// {
//   name: "Apple Inc.",
//   isin: "US0378331005",
//   exchange: "NASDAQ",
//   splits: [
//     { date: "2020-08-31", ratio: "4:1" },
//     { date: "2014-06-09", ratio: "7:1" },
//     ...
//   ]
// }

// Look up symbol by ISIN
const symbol = data.byIsin['US0378331005']; // "AAPL"
```

### Individual Year Files

```javascript
// Fetch splits for a specific year
const response = await fetch(
  'https://cdn.jsdelivr.net/gh/coffee-cpu/stock-splits-data@main/data/2024.json'
);
const data = await response.json();
console.log(data.splits);
```

### TypeScript Types

```typescript
interface SplitEntry {
  symbol: string;
  name: string;
  date: string;      // YYYY-MM-DD
  ratio: string;     // e.g., "4:1"
  isin?: string;
  exchange?: string;
  notes?: string;
}

interface IndexData {
  version: string;
  updated: string;
  totalSplits: number;
  years: number[];
  bySymbol: Record<string, {
    name: string;
    isin?: string;
    exchange?: string;
    splits: Array<{ date: string; ratio: string; notes?: string }>;
  }>;
  byIsin: Record<string, string>;
}
```

### Caching Example

```javascript
const CACHE_KEY = 'stock-splits-data';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function getSplitsData() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) {
      return data;
    }
  }

  const response = await fetch(
    'https://cdn.jsdelivr.net/gh/coffee-cpu/stock-splits-data@main/data/index.json'
  );
  const data = await response.json();

  localStorage.setItem(CACHE_KEY, JSON.stringify({
    data,
    timestamp: Date.now()
  }));

  return data;
}
```

## Data Structure

```
data/
├── index.json      # Combined lookup (auto-generated)
├── 2020.json       # Splits from 2020
├── 2021.json       # Splits from 2021
├── 2022.json       # etc.
├── 2024.json
└── 2025.json
```

### Year File Format

```json
{
  "$schema": "../schema/year-file.schema.json",
  "year": 2024,
  "updated": "2025-01-25",
  "count": 7,
  "splits": [
    {
      "symbol": "NVDA",
      "name": "NVIDIA Corporation",
      "date": "2024-06-10",
      "ratio": "10:1",
      "isin": "US67066G1040",
      "exchange": "NASDAQ"
    }
  ]
}
```

### Split Ratio Format

Ratios are expressed as `new:old`:
- `4:1` = 4 new shares for every 1 old share (forward split)
- `1:10` = 1 new share for every 10 old shares (reverse split)
- `3:2` = 3 new shares for every 2 old shares

## Calculating Adjusted Cost Basis

```javascript
function parseRatio(ratio) {
  const [newShares, oldShares] = ratio.split(':').map(Number);
  return newShares / oldShares;
}

function adjustForSplits(purchaseDate, symbol, originalShares, originalCost, splitsData) {
  const symbolData = splitsData.bySymbol[symbol];
  if (!symbolData) return { shares: originalShares, costPerShare: originalCost / originalShares };

  let adjustedShares = originalShares;
  let adjustedCost = originalCost;

  for (const split of symbolData.splits) {
    if (split.date > purchaseDate) {
      const multiplier = parseRatio(split.ratio);
      adjustedShares *= multiplier;
      // Cost basis stays the same, but cost per share decreases
    }
  }

  return {
    shares: adjustedShares,
    costPerShare: adjustedCost / adjustedShares
  };
}

// Example: 10 shares of AAPL bought on 2010-01-01 for $200
const result = adjustForSplits('2010-01-01', 'AAPL', 10, 200, data);
// After 7:1 (2014) and 4:1 (2020) splits: 280 shares, $0.71/share
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding or correcting split data.

## Data Sources

- Company investor relations announcements
- SEC filings
- Exchange notices
- Financial data providers

## License

MIT License - see [LICENSE](LICENSE) for details.
