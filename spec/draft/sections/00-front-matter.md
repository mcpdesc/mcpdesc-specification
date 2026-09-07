---
title: MCP Description Specification
version: 0.8.0
status: Release candidate 3
release-candidate-iteration: 3
snapshot-tag: v0.8.0-rc.3
released: false
baseline: 0.7.0
baseline-snapshot: v0.8.0-draft.4
date: 2026-09-07
editors:
  - name: Cisco DevNet (v0.7.0 baseline)
    url: https://developer.cisco.com
  - name: Stève Sfartz (v0.8.0 draft)
    url: https://github.com/stsfartz
  - name: "{mcpdesc} community"
    url: https://github.com/mcpdesc/mcpdesc-specification
---

# MCP Description Specification

**Version**: 0.8.0 (release candidate 3; `v0.8.0-rc.3`)

**Status**: Release candidate 3 — prerelease

**Baseline**: v0.7.0

**Date**: 2026-09-07

## Abstract

This specification defines the **MCP Description** format — a portable, machine-readable document that describes the durable, externally relevant surface of a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server.

An MCP Description declares supported MCP protocol revisions, instructions, transports, security requirements, capabilities, tools, resources, resource templates, prompts, and metadata in a static, machine-readable document.

It enables offline discovery, documentation generation, description validation, change analysis, testing, governance, and [interoperable tooling](../../implementations.md) across the MCP ecosystem.

## Status of This Document

This document is **Release Candidate 3** for MCP Description v0.8.0, identified by prerelease tag `v0.8.0-rc.3` and based on Community Working Draft 4. RC.3 is behavior-equivalent to RC.2 for MCP Description documents: its document-conformance requirements, schema validation behavior, semantic validation behavior, examples, and conformance fixtures are unchanged apart from the new release identity and schema references. Repository publication and artifact-maintenance policy is maintained separately in the repository governance. The exact review-stage proposal revisions represented by the Draft 4 baseline are recorded in the [proposal revision manifest](../PROPOSALS.md).

This is **not** a stable release and may change before final release as review and interoperability testing conclude.

The current stable release is v0.7.0, whose canonical source remains the Cisco Open `mcptoolkit-contract` repository.





