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
  "exchange": "NASDAQ",
  "source": "https://www.sec.gov/Archives/edgar/data/...",
  "notes": "Board approved YYYY-MM-DD. Record date YYYY-MM-DD. Distributed YYYY-MM-DD. Split-adjusted trading began YYYY-MM-DD."
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

## Research Procedure: Finding All Splits in a Date Range

Use this procedure to compile a complete list of stock splits for a given period (e.g., "all splits in January 2026", "all 2025 splits", "splits in the last 7 days").

### Step 1: Search SEC EDGAR Full-Text Search (EFTS)

Every US public company stock split triggers an 8-K filing. The SEC EDGAR full-text search indexes these filings and supports date-range queries.

**URL template:**
```
https://efts.sec.gov/LATEST/search-index?q=QUERY&dateRange=custom&startdt=YYYY-MM-DD&enddt=YYYY-MM-DD&forms=8-K
```

Run three separate searches, each with a different query, to catch all types of corporate actions:

| Query | URL-encoded query | What it catches |
|-------|-------------------|-----------------|
| `"stock split"` | `%22stock+split%22` | Forward and reverse splits |
| `"stock dividend"` | `%22stock+dividend%22` | Stock dividends (e.g., 5% dividend = 21:20) |
| `"reverse stock split"` | `%22reverse+stock+split%22` | Reverse splits specifically |

**Example — all splits in January 2026:**
```
https://efts.sec.gov/LATEST/search-index?q=%22stock+split%22&dateRange=custom&startdt=2026-01-01&enddt=2026-01-31&forms=8-K
```

For each result, open the 8-K filing and extract:
- Company name and ticker symbol
- Split ratio
- Key dates: board approval, record date, distribution/effective date, first split-adjusted trading date

> **Note:** EDGAR requires a `User-Agent` header with a company name and email (e.g., `stock-splits-data research@github.com`). The human-facing search at [sec.gov/edgar/search](https://www.sec.gov/edgar/search/) also works — use the "8-K" form type filter.

### Step 2: Cross-Reference with Exchange Calendars

Check these public sources for any splits not captured by EDGAR full-text search:

- **NASDAQ Stock Splits**: [nasdaq.com/market-activity/stock-splits](https://www.nasdaq.com/market-activity/stock-splits)
- **NASDAQ Listing Center**: [listingcenter.nasdaq.com](https://listingcenter.nasdaq.com/) — corporate actions feed
- **NYSE Corporate Actions**: [nyse.com](https://www.nyse.com/publicdocs/Corporate_Actions_Guidance.pdf)

### Step 3: Verify Each Split Against Primary Source

For every split found, locate the authoritative source document:

1. **SEC 8-K filing** (best) — search [EDGAR](https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=8-K) by company name or CIK. Look for Item 5.03 (Amendments to Articles of Incorporation) or Item 8.01 (Other Events).
2. **Company investor relations page** — search: `[Company Name] investor relations stock split [year]`
3. **Exchange announcement** — NASDAQ/NYSE corporate action notices

Use the most authoritative source (SEC filing > company IR > exchange notice) as the `source` field value.

### Step 4: Record Each Entry

For each verified split, record:

| Field | Where to find it | Convention |
|-------|-----------------|------------|
| `symbol` | EDGAR filing header, exchange listing | Uppercase ticker |
| `name` | Filing header | Full legal name |
| `date` | 8-K filing body | **Distribution/effective date** (see below) |
| `ratio` | 8-K filing body | `new:old` format |
| `exchange` | EDGAR filing header | `NASDAQ`, `NYSE`, etc. |
| `source` | URL of the filing/press release | Direct link to SEC filing or company IR page |
| `notes` | Compiled from filing | All key dates and context (see template below) |
| `isin` | EDGAR filing header (if available) | 2 letters + 10 alphanumeric chars |

**Notes template:**
```
Board approved YYYY-MM-DD. Record date YYYY-MM-DD. Distributed YYYY-MM-DD. Split-adjusted trading began YYYY-MM-DD. SEC 8-K: [url]
```

### Date Convention

Always use the **distribution/effective date** — the date shares are actually distributed to shareholders:

| Date type | Example | Use as `date`? |
|-----------|---------|----------------|
| Board approval date | Mar 13, 2025 | No |
| Record date | Jun 2, 2025 | No |
| **Distribution/effective date** | **Jun 9, 2025** | **Yes** |
| First split-adjusted trading date | Jun 10, 2025 | No |

If a filing says "shares distributed after the close of trading on June 9" and "split-adjusted trading begins June 10", the `date` is `2025-06-09`.

### Step 5: Validate and Submit

1. Add entries to the correct `data/YYYY.json` file, maintaining alphabetical order by `symbol`
2. Update the `updated` field to today's date
3. Run `npm run validate`
4. Submit a PR (see Pull Request Guidelines above)

### Finding a Specific Known Split

If you already know which company split and just need the details:

1. **SEC EDGAR**: Search for the company's 8-K filings at [sec.gov/cgi-bin/browse-edgar](https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=8-K)
2. **Company IR page**: Search `[Company Name] investor relations stock split [year]`
3. **Financial news**: Use Reuters, Yahoo Finance, etc. to verify — but always link to the original SEC filing or company press release as the `source`

## Questions?

Open an issue if you:
- Find conflicting information about a split
- Need help with the contribution process
- Want to suggest improvements to this guide

Thank you for contributing!
