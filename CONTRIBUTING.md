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

### 3. Update the Date

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

## Acceptable Data Sources

**IMPORTANT**: Only use publicly available sources that do not require API access or paid subscriptions. This ensures legal compliance and data quality.

### ✅ Acceptable Sources (Public Record Only)

All contributions must be verifiable through one of these public sources:

- **SEC EDGAR filings**: 8-K forms, proxy statements (public domain)
- **Company investor relations pages**: Official press releases and announcements
- **Exchange announcements**: NYSE, NASDAQ corporate action notices
- **Company official websites**: Investor relations sections

### ❌ Prohibited Sources

Do NOT submit data from:

- **Financial data APIs** (Polygon.io, Massive, Alpha Vantage, etc.) - violates their terms of service
- **Paid data services** (Bloomberg Terminal, FactSet, etc.) - redistribution not permitted
- **Aggregator websites** without original source verification
- **Third-party databases** that restrict redistribution

### Why These Restrictions?

Most financial data APIs and paid services explicitly prohibit:
- Redistribution of their data to third parties
- Creating public datasets or derivative databases
- Commercial or public use beyond personal consumption

Using only original public records (SEC filings, company announcements) ensures:
- No terms of service violations
- Highest data accuracy (primary sources)
- Legal compliance for all contributors and users

## Finding Split Information

Reliable methods to find stock split data:

1. **SEC EDGAR Search**: [https://www.sec.gov/edgar/search/](https://www.sec.gov/edgar/search/)
   - Search for company name + "8-K" + "stock split"
   - Look for Form 8-K Item 5.03 (Amendments to Articles of Incorporation or Bylaws)

2. **Company IR pages**: Most companies announce splits via press release
   - Google: `[Company Name] investor relations stock split`
   - Example: `NVIDIA investor relations stock split 2024`

3. **Exchange websites**: NYSE and NASDAQ publish corporate action calendars
   - [NASDAQ Corporate Actions](https://listingcenter.nasdaq.com/)
   - [NYSE Corporate Actions](https://www.nyse.com/publicdocs/Corporate_Actions_Guidance.pdf)

4. **Financial news verification**: Use Reuters, Bloomberg, Yahoo Finance to verify, but always link to the original source (SEC filing or company press release) in your PR

## Questions?

Open an issue if you:
- Find conflicting information about a split
- Need help with the contribution process
- Want to suggest improvements to this guide

Thank you for contributing!
