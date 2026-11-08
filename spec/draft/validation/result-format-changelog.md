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

## [1.4.0] — 2026-11-07 (0.9.0 RC.3 candidate)

Adds structured diagnostic facts and related component-definition locations
under review-stage [Proposal 0035](../proposal-snapshots/0035-union-aware-diagnostics.md).
The schema identity is
`https://mcpdesc.org/schema/validation-result/1.4.0.json`; it is a candidate
format, not a published URL.

### Format

- Diagnostics may include `detail` and `relatedLocations`. Schema-derived
  diagnostics require `detail` under Section 16.5; details are factual and
  `kind` is extensible.
- Detail kinds describe missing or unexpected members, invalid member names,
  values and types, conflicting members, missing alternatives, and other
  keyword constraints. Their required fields are validated by the schema.
- A `component-definition` related location identifies the source within a
  component for a diagnostic whose primary `path` identifies its reference
  use site.
- `1.3.0` and earlier published schemas remain unchanged.

### Consumer Migration

- Prefer recognized `detail.kind` and fields for structured explanations;
  fall back to `message` for unknown kinds or diagnostics without detail.
- Use `relatedLocations` to provide navigation from a reference use site to
  its component definition.

## [1.3.0] — 2026-11-02 (0.9.0 RC.1)

Breaking terminology migration for MCP protocol versions. The schema identity
is `https://mcpdesc.org/schema/validation-result/1.3.0.json`; deployment must be
verified before publishing the RC.1 catalog.

### Format

- Renamed `#/$defs/revision` to `#/$defs/protocol-version`. The
  `protocolVersion` diagnostic and rule-result properties remain unchanged.
- Rule identifiers inside results change to the protocol-version terminology
  listed in issue #109.
- The schema is a new immutable URL; `validation-result/1.0.0.json` remains
  unchanged.

### Consumer Migration

- Update schema pins to `validation-result/1.3.0.json` and replace any
  `$defs/revision` references with `$defs/protocol-version`.
- Update rule IDs consumed from diagnostics and rule results using the issue
  #109 mapping.

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
