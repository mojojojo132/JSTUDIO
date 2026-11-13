# One project, two engines, one handoff

```text
Studio Brand Packs/<id>/<version>
                 │ validate and pin at project creation
Studio Content/<workspace>/projects/<slug>/
  PROJECT.json + brand/             identity, paths and immutable brand snapshot
  STORYBOARD.md + INTERACTION-LOG.md  meaning, constraints and actual decisions
  REVIEW.json                      exact storyboard/shot/cut fingerprints and approvals
  animation/                       editable Animator source
    → reviews/animation/           rendered versions and review evidence
    → guarded review-only clip staging
  editor/assets/animations/   immutable versioned clip copies
  editor/                     native timeline, captions, footage, sound and editable HTML
  EXCHANGE.json                    exact source → actual native timing/media mapping
    → guarded native export
  reviews/final/ → delivery/       complete encoded candidate → same bytes delivered
  evidence/                       checks and run reports
```

Use `npm run workflow -- <slug> ...` throughout. `status` shows the current paths and missing steps. `animation` delegates to Animator; `edit` opens Editor. `init`, `register`, `approve`, `import`, `exchange`, `preflight`, `render` and `deliver` delegate to the matched handoff tools. See the installed Director's `references/studio-workflow.md` for descriptor/evidence examples and CLI help for exact arguments. Existing configured/lowercase ledgers are reused; do not create a second ledger.

Every storyboard, animation or final candidate presented for review also creates an exact-hash learning packet at `evidence/improvement-packets/<packet-id>/`. Director records film-only fixes locally and reusable Studio/creative-system findings in the shared profile with `npm run improve -- record <slug> evidence/improvement-packets/<packet-id>/FINDINGS.json`. Open recurring findings appear in later Director handoffs; `npm run improve -- status` shows backlog, review coverage and supported telemetry. An empty findings list records a run with no reusable lesson. This loop informs tested Studio changes; it never edits product code or changes film approval by itself.

Approvals require actual human evidence for exact registered versions. Synthetic approval is confined to explicitly marked engineering fixtures. A new import does not overwrite an old approved clip. Native composition remains free-form; EXCHANGE describes the actual edit and source trims rather than constraining scene design. Managed projects with animation imports require an exchange before Studio CLI export. Footage-only projects can omit the animation stage; preserve their storyboard and final review.

The installed Editor UI export bridge runs shared finishing checks and records its command evidence. Unmanaged direct engine binaries can bypass Studio wrappers; run explicit preflight and encoded review checks for those paths. Static preflight does not certify dynamic media bindings or creative quality. Imported video is not the editable animation source: revise animation/, review/import its new version, then adjust the native edit.

Brand copies inside a project are required portable render dependencies of its single pin. Runtime has no JStudio brand kit and no fallback output brand. Old kits are archived in Builder and never shipped or selected automatically.

Default to one decision on the complete candidate. Use --review-only with import, exchange, preflight and render to build it before approval. Deliver uses the exact approved bytes, never a fresh render. Plain approval records acceptance, not a watched/listened attestation.

Director chooses each beat’s production route through `VIDEO-PLAN.json` and `workflow plan`: real capture, original animation, original/source evidence or licensed illustrative footage/B-roll. The planner dispatch description is read-only; Director executes the available tools and records actual acquired/rendered assets. No route proves capture availability or asset rights.
