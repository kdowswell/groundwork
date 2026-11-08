---
id: approved-data-stores
title: Approved Data Stores
category: security
sources:
  - name: "Example Corp Platform Standard PS-12: Data Store Approval (internal)"
    url: "https://example.com/standards/ps-12"
applies_when:
  scope: [new_build, epic, feature]
  scale: [team, enterprise]
  stage: [refinement, build, maintain]
  domains: [any_production]
tags: [house-rule, data-stores, compliance, example-overlay]
---

# Approved Data Stores

## Principle
Store production data only in the data stores the platform team has approved for its classification, and request approval before adding a new kind of store. Approved stores come with backups, encryption at rest, access logging, and an on-call owner already in place; an unapproved store arrives with none of them, and the team that added it inherits all of them.

## When This Matters
- A design introduces a new data store, cache, queue, or search index for production data
- Data classified confidential or restricted is stored anywhere new
- A prototype is about to be promoted to production with the store it was built on

## When This Doesn't Matter
- Local development and throwaway prototypes that never hold production data
- Ephemeral build caches that hold no customer or company data

## Questions the Agent Should Ask
- Is every data store in this design on the approved list for the data it will hold?
- If a new kind of store is needed, has an approval request been filed, and what is the fallback if it is refused?
- Who owns backups, encryption, and on-call for any store not on the list?

## What Good Looks Like
- The architecture's Components table names an approved store for each piece of production data, or links the approval request for a new one
- A store that holds restricted data is one approved for restricted data, not just for internal data

## What Goes Wrong When You Skip This
- A team ships on a store nobody else operates; the first outage happens at night with no runbook and no owner beyond the one engineer who chose it
- An audit finds restricted data in a store without access logging, and the remediation is a migration under deadline

## Further Reading
This file is an example of an organization overlay (ADR-023): a house rule written in the library's format and sourced from the organization's own standard. Replace the source with your standard's real location. Overlays sit in `.groundwork/principles/<category>/` or in an org package listed in `.groundwork/config.json`, and selection, the router, and `doctor` treat them like built-in principles.
