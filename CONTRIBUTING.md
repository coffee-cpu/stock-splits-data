# Contributing to Stock Splits Data

Thank you for helping maintain this stock splits catalog! This guide explains how to add or correct split data.

## Quick Start

1. Fork this repository
2. Edit the appropriate year file in `data/`
3. Run `npm run validate` to check your changes
4. Submit a pull request with a source link

## Adding a New Split

### 1. Find the Correct Year File

Splits are organized by the year they occurred. Edit `data/YYYY.json` where YYYY is the year of the split.

### 2. Add the Split Entry

Add your entry to the `splits` array, maintaining alphabetical order by symbol:

```json
{
  "symbol": "TICKER",
  "name": "Company Name, Inc.",
  "date": "2024-06-15",
  "ratio": "4:1",
  "isin": "US1234567890",
  "exchange": "NASDAQ"
}
```

### 3. Update the Count

Increment the `count` field at the top of the file to match the new total.

### 4. Update the Date

Update the `updated` field to today's date (YYYY-MM-DD format).

## Required Fields

| Field | Description | Example |
|-------|-------------|---------|
| `symbol` | Stock ticker (uppercase) | `"AAPL"` |
| `name` | Full company name | `"Apple Inc."` |
| `date` | Split effective date | `"2024-06-15"` |
| `ratio` | Split ratio (new:old) | `"4:1"` |

## Recommended Fields

| Field | Description | Example |
|-------|-------------|---------|
| `isin` | 12-character ISIN | `"US0378331005"` |
| `exchange` | Primary exchange | `"NASDAQ"`, `"NYSE"` |

## Optional Fields

| Field | Description | Example |
|-------|-------------|---------|
| `source` | Data source URL | `"https://..."` |
| `verified` | Verified against official source | `true` |
| `notes` | Additional context | `"Created Class C shares"` |

## Ratio Format

Express ratios as `new:old` shares:

- **Forward split**: `"4:1"` = receive 4 shares for every 1 held
- **Reverse split**: `"1:10"` = receive 1 share for every 10 held
- **Fractional**: `"3:2"` = receive 3 shares for every 2 held

## Validation

Before submitting, validate your changes locally:

```bash
npm install
npm run validate
```

The validator checks:
- JSON schema compliance
- Count matches actual splits
- Dates are in the correct year
- No duplicate entries (same symbol + date)
- Valid ISIN format (if provided)
- Valid ratio format

## Pull Request Guidelines

### Title Format

```
Add [SYMBOL] [YYYY] split
```

or

```
Fix [SYMBOL] [YYYY] split data
```

### Description

Include in your PR description:
1. The split details you're adding/correcting
2. **Source link** (required) - one of:
   - Company press release or investor relations page
   - SEC filing (8-K, proxy statement)
   - Exchange announcement
   - Major financial news source

### Example PR

**Title**: Add NVDA 2024 split

**Description**:
```
Adding NVIDIA's 10-for-1 stock split effective June 10, 2024.

Source: https://investor.nvidia.com/news/press-release-details/2024/NVIDIA-Announces-10-for-1-Stock-Split/
```

## Creating a New Year File

If you need to add a split for a year that doesn't have a file yet:

1. Create `data/YYYY.json` with this template:

```json
{
  "$schema": "../schema/year-file.schema.json",
  "year": YYYY,
  "updated": "2025-01-25",
  "count": 1,
  "splits": [
    {
      "symbol": "TICKER",
      "name": "Company Name",
      "date": "YYYY-MM-DD",
      "ratio": "X:Y",
      "isin": "XXXXXXXXXXXX",
      "exchange": "EXCHANGE"
    }
  ]
}
```

2. Replace placeholders with actual values
3. Run validation

## Finding Split Information

Reliable sources for stock split data:

- **Company IR pages**: Most companies announce splits via press release
- **SEC EDGAR**: Search for 8-K filings mentioning "stock split"
- **Exchange websites**: NYSE, NASDAQ corporate actions
- **Financial news**: Reuters, Bloomberg, Yahoo Finance

## Questions?

Open an issue if you:
- Find conflicting information about a split
- Need help with the contribution process
- Want to suggest improvements to this guide

Thank you for contributing!
