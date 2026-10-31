# Validation Result Format Changelog

This changelog records changes to the validation result format defined by
[`result.schema.json`](result.schema.json): document validity, diagnostics,
and rule results. Format versions are independent of MCP Description
versions, rule-format versions, and validator package versions. The
[rule-format changelog](CHANGELOG.md) records the catalog that the `rule`
identifiers refer to.

## Compatibility policy

Incompatible changes require a major version, including new required
properties and new status values, which consumers must be able to interpret.
Compatible additions are minor. Editorial schema documentation corrections use
a new patch-version URL. Published versioned URLs retain their exact bytes.

## [1.0.0] — 2026-10-31 (Draft 4)

First format, for the MCP Description 0.9.0 Draft 4 working tree,
implementing review-stage
[Proposal 0031](../proposal-snapshots/0031-rule-level-validation-results.md).
The schema identity is
`https://mcpdesc.org/schema/validation-result/1.0.0.json`; it is a publication
target until deployment is verified. Draft 4 catalog manifests list it as
`resultSchema`.

### Format

- A result has `valid` and `diagnostics`, and optionally `results`. Producers
  may add properties to the result and to diagnostics.
- A diagnostic requires `rule`, `severity` (`error` or `warning`), and `path`.
  `protocolVersions`, `code`, and `message` are optional; codes and messages
  belong to the producer.
- A rule result has `rule`, an optional `protocolVersion`, and a `status`:
  `passed`, `failed`, `warning`, `not-applicable`, `not-evaluated`, or
  `delegated`. A `not-evaluated` status may carry a `reason`:
  `earlier-stage-failed`, `not-implemented`, or `operation`. Rule results are
  closed objects.

### Consumer Migration

- Key on `rule`, not `code`. Read `not-applicable` and `not-evaluated` as "not
  confirmed", never as passed.
- Validity is still determined by errors alone.
