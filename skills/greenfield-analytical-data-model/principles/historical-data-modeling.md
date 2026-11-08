<!-- source: principles/data/historical-data-modeling.md -->

# Historical Data Modeling

## Principle
Decide, for each entity and attribute, whether queries need only its current value or its value as it was at a past point in time, and model that answer explicitly. Overwriting a value destroys the old one; once that has happened in production, the history can't be recovered from the model, only from backups or the source. History is cheap to keep at design time and expensive or impossible to reconstruct later.

There are two different kinds of "as it was." **Valid time** is when a fact was true in the world: the customer lived in Ohio from March to June. **Record time** (transaction time in the SQL standard and the temporal database literature) is when your system knew it: you learned about the move in July. Most systems only need valid time. Systems that must answer "what did we report, and why" need both, which is a bitemporal model. Slowly changing dimension (SCD) types are the warehouse vocabulary for these choices: Type 1 overwrites, Type 2 adds a new row with effective dates for each change, and the other types are variations on keeping limited or separate history.

## When This Matters
- Reports and metrics must be reproducible: last quarter's numbers should not change because a customer changed region this week
- Facts must be analyzed against the attributes in effect when they happened (sales by the sales rep's territory at the time of sale, not their territory today)
- Auditors, regulators, or customers can ask what the system showed, or what a record looked like, on a given date
- Corrections are routine (backdated price changes, retroactive policy changes, late-reported events) and you have to tell an original value from a corrected one
- You are designing a dimensional model, a customer or product master, or any reference data that facts join to

## When This Doesn't Matter
- The attribute is a fix to bad data, not a real change (a misspelled name), and nobody will ever ask what the wrong value was; overwrite it
- The data is operational state that only matters now (a session's current step, a cache entry), and history would be noise
- History already exists in an immutable upstream log or raw layer you can query, and nothing needs it in fast, query-ready form; derive it on demand instead of modeling it twice

## Questions the Agent Should Ask
- For each attribute that can change: when it changes, should old facts be reported against the old value or the new one? Is that the same answer for every consumer?
- Is a change to this attribute a correction (the old value was wrong) or a real change (the old value was right at the time)? Does the model treat the two differently?
- Does anyone need to know when the system learned something, separate from when it became true? Will you ever have to reproduce a report exactly as it was first published?
- How do facts join to the right version of a dimension: through a surrogate key fixed when the fact was loaded, or by an as-of join on dates?
- What are the conventions for effective and end dates: inclusive or exclusive end, the sentinel value for "current," the time zone, and the precision?
- What happens when a change arrives late or out of order? Does the model close and reopen versions correctly, or does it assume changes arrive in sequence?
- How fast will versioned tables grow? Which attributes change often enough that full-row versioning would multiply the table, and should those be split out?
- If personal data has to be erased, how is that done across every historical version without breaking the history of non-personal attributes?

## What Good Looks Like
- Each changeable attribute has a documented history policy (overwrite, version, or keep prior value), chosen with the people who use the reports
- Versioned entities carry a stable business key, a surrogate key per version, and explicit effective-from and effective-to dates, plus a current flag where it simplifies queries
- Facts are linked to the dimension version in effect at event time, so historical reports are stable when dimensions change
- Where restatement matters, the model records both valid time and record time, and "as originally reported" and "as currently known" are both answerable queries
- Late or backdated changes are handled by tested logic that splits and closes version ranges; tests cover out-of-order arrival
- Frequently changing attributes are kept apart from slowly changing ones, so versioning one doesn't explode the other
- Erasure of personal data is designed in, so the right fields can be removed from every version without losing the rest of the history

## What Goes Wrong When You Skip This
- A sales rep moves to a new territory and the customer table is overwritten; every historical sales report re-attributes their past deals to the new territory, and commissions already paid no longer reconcile
- Last quarter's board numbers change every time they are re-run, and finance stops trusting the warehouse and builds their own spreadsheet copy
- A regulator asks what a patient's record showed on a specific date; the system only holds the current value, and the answer has to be pieced together from backups
- A backdated price correction is applied as an overwrite, so it's impossible to tell which invoices were issued at the old price and which at the corrected one
- Type 2 versioning is applied to every column by default, including a "last seen" timestamp that changes daily, and the dimension grows by millions of rows a month with almost no useful history
- Effective-date ranges overlap or leave gaps because changes arrived out of order, so an as-of join returns two rows for some dates and none for others, silently double-counting or dropping facts
