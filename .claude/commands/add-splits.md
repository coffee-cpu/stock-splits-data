# Add Stock Splits

Research and add stock split data for the specified time range.

**Usage:** `/add-splits 2024`, `/add-splits "January 2026"`, `/add-splits "last 7 days"`

**Time range argument:** $ARGUMENTS

---

## Instructions

You are a stock splits researcher. Follow these steps precisely.

### Step 0 — Parse Time Range

Parse `$ARGUMENTS` into a start date and end date (YYYY-MM-DD format):
- A year like `2024` → `2024-01-01` to `2024-12-31`
- A month like `"January 2026"` → `2026-01-01` to `2026-01-31`
- A relative range like `"last 7 days"` → compute from today's date
- A specific date range like `"2024-06-01 to 2024-06-30"` → use as-is

Determine which year file(s) are affected (e.g., a range spanning Dec–Jan touches two year files).

### Step 1 — Load Existing Data

Read the relevant `data/YYYY.json` file(s). Build a set of known `SYMBOL:DATE` pairs so you can skip splits that are already catalogued. If a year file doesn't exist yet, note that you'll need to create it later.

### Step 2 — Initialize Progress Tracking

Create a progress file at `.claude/scratch/add-splits-progress.json` with this structure:

```json
{
  "timeRange": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "startedAt": "<current ISO-8601 timestamp>",
  "status": "discovery",
  "existingSplits": ["SYMBOL:DATE", ...],
  "discoveredCandidates": [],
  "researchedSplits": [],
  "addedSplits": [],
  "skippedSplits": [],
  "errors": []
}
```

If a progress file already exists for the **same time range**, ask the user whether to resume from where it left off or start fresh.

### Step 3 — Discovery via SEC EDGAR Full-Text Search

Search for 8-K filings mentioning stock splits using the SEC EDGAR EFTS API.

**IMPORTANT: SEC EDGAR API Requirements**
- The SEC blocks requests without a proper User-Agent header containing an email address
- WebFetch will return 403 errors — you MUST use `curl` via Bash instead
- Format: `curl -s -A "your-app-name/1.0 (your-email@example.com)" "<url>"`
- Rate limit: max 10 requests per second

Run searches using curl (pipe to `jq` for parsing):

```bash
# Search for forward stock splits
curl -s -A "stock-splits-research/1.0 (contact@example.com)" \
  "https://efts.sec.gov/LATEST/search-index?q=%22forward%20stock%20split%22&forms=8-K&dateRange=custom&startdt=<start>&enddt=<end>" \
  | jq '.hits.total.value, .hits.hits[]._source.display_names[0], .hits.hits[]._source.file_date'

# Search for specific forward ratios (excludes most reverse splits)
curl -s -A "stock-splits-research/1.0 (contact@example.com)" \
  "https://efts.sec.gov/LATEST/search-index?q=%222-for-1%22%20OR%20%223-for-1%22%20OR%20%224-for-1%22%20OR%20%225-for-1%22%20OR%20%2210-for-1%22%20OR%20%2215-for-1%22&forms=8-K&dateRange=custom&startdt=<start>&enddt=<end>"
```

Handle pagination: check `hits.total.value` in the response. If there are more results than returned (default 100), use the `from` parameter to fetch subsequent pages.

Additionally, cross-reference with a WebSearch for NASDAQ/NYSE stock split calendars for the time range to catch any splits not found via EDGAR.

**Note on aggregator sites**: Sites like Yahoo Finance, stockanalysis.com can be used for discovery, but each split must be verified against original sources (SEC filings, company press releases) before adding to the data.

**Deduplicate** candidates by CIK (Central Index Key) — the same company may appear in multiple searches. Update the progress file with all discovered candidates.

**Filtering candidates**: Many SEC filings mentioning "forward stock split" are actually reverse/forward combinations used to eliminate small shareholders. These should be marked as NOT_A_FORWARD_SPLIT. A genuine forward split increases shares for ALL shareholders.

### Step 4 — Research Each Candidate

For each candidate NOT already in the existing data (check against the `SYMBOL:DATE` set from Step 1):

Use the **Task tool** to dispatch a sub-agent for each candidate. The sub-agent should:

1. Read the 8-K filing (via WebFetch on the filing URL)
2. Extract these fields:
   - `symbol` — ticker symbol (uppercase, letters/numbers/dots only)
   - `name` — full company name
   - `date` — effective/distribution date (YYYY-MM-DD)
   - `ratio` — split ratio in `new:old` format (e.g., `4:1` for forward, `1:10` for reverse)
   - `exchange` — primary exchange (NASDAQ, NYSE, NYSE American, etc.)
   - `isin` — ISIN if mentioned (format: 2 uppercase letters + 10 alphanumeric characters)
   - `source` — URL of the primary source (press release or SEC filing)
   - `notes` — key details: board/shareholder approval dates, record date, CUSIP changes, reason for split
3. Return a JSON object with these fields, OR return `"NOT_A_SPLIT"` if the filing is not actually about a stock split (e.g., mentions "split" in a different context)

**Process candidates in batches of 3-5** for parallelism (launch multiple Task sub-agents simultaneously).

After each batch completes, update the progress file — this serves as a checkpoint so the process can resume if interrupted.

**Important research guidelines:**
- Only use publicly available sources (SEC filings, company press releases, exchange announcements)
- Do NOT use financial data APIs or paid services
- Verify the split actually happened (not just announced) — check for effective date confirmation
- For the `ratio` field, always express as `new:old` (e.g., a 4-for-1 forward split = `4:1`, a 1-for-10 reverse split = `1:10`)

### Step 5 — Deduplicate

After all research is complete, deduplicate the results:
- Remove any entries where `SYMBOL:DATE` already exists in the loaded data
- Remove any duplicate entries within the newly researched set
- Log skipped entries with reasons in the progress file

### Step 6 — Add to Data Files

For each new split entry:

1. Determine the correct year file (`data/YYYY.json`)
2. If the year file doesn't exist, create it with this structure:
   ```json
   {
     "$schema": "../schema/year-file.schema.json",
     "year": YYYY,
     "updated": "YYYY-MM-DD",
     "splits": []
   }
   ```
3. Insert the entry into the `splits` array in **alphabetical order by symbol**
4. Update the `updated` field to today's date (YYYY-MM-DD)

Include only fields that have values — don't include `isin`, `exchange`, `source`, or `notes` if they're empty/unknown. The required fields are: `symbol`, `name`, `date`, `ratio`.

### Step 7 — Validate

Run `npm run validate` to check all data files pass schema validation.

If validation fails:
- Read the error messages carefully
- Fix the issues (common problems: date format, ratio format, ISIN format, duplicate entries)
- Re-run validation until it passes

### Step 8 — Present Summary

Display a summary table showing:
- **Added**: splits successfully added (with symbol, name, date, ratio)
- **Skipped**: splits that were already in the data or couldn't be verified
- **Errors**: candidates that couldn't be researched (with error details)

Then show the full `git diff` of changes made to data files.

**Do NOT commit automatically.** Ask the user to verify the changes before committing, per project convention.
