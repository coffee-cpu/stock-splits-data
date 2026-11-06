## Description

<!-- Briefly describe the split(s) you are adding or correcting -->

## Source

<!-- Link to the primary source document (required) -->
- [ ] SEC EDGAR 8-K filing: <!-- URL -->
- [ ] Company investor relations page: <!-- URL -->
- [ ] Exchange announcement: <!-- URL -->

## Checklist

- [ ] I ran `npm run validate` and all checks pass
- [ ] I included a source URL (SEC filing, company IR page, or exchange notice)
- [ ] Entries are sorted by symbol, then date
- [ ] I updated the `updated` field to today's date
- [ ] The source is a public record (not from a paid API or restricted service)
- [ ] Ratio uses integer `ratioNew`/`ratioOld` fields in lowest terms (e.g., `ratioNew: 4, ratioOld: 1` for a 4-for-1 split)
- [ ] Date is the first split-adjusted trading day (ex-date), not the record, payable or approval date
- [ ] Every listed share class has its own entry (e.g. GOOG and GOOGL)
