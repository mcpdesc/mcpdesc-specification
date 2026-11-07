---
title: MCP Description Specification
version: 0.9.0
status: Release candidate 3
release-candidate-iteration: 3
snapshot-tag: v0.9.0-rc.3
released: false
baseline: 0.8.0
baseline-snapshot: v0.9.0-rc.2
date: 2026-11-07
---

# MCP Description Specification

**Version**: 0.9.0 (Release Candidate 2; `v0.9.0-rc.2`)

**Status**: Release Candidate 2 — in preparation; not published

**Baseline**: v0.8.0

**Date**: 2026-11-06

## Abstract

This specification defines the **MCP Description** format — a portable, machine-readable document that describes the durable, externally relevant surface of a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server.

An MCP Description declares supported MCP protocol versions, instructions, transports, security requirements, capabilities, tools, resources, resource templates, prompts, and metadata in a static, machine-readable document.

It enables offline discovery, documentation generation, description validation, change analysis, testing, governance, and [interoperable tooling](../../implementations.md) across the MCP ecosystem.

## Status of This Document

This document is Release Candidate 2 of MCP Description v0.9.0, prepared for the prerelease tag `v0.9.0-rc.2`. It includes the Section 18 document ordering profile and review-stage Proposal 0034's discriminator-driven schema validation. It has not yet been tagged or published. It is not a stable release or evidence of acceptance of review-stage proposals; its content may change incompatibly or be removed before release. The current stable release is MCP Description v0.8.0.

The exact proposal revisions represented in this candidate are recorded in the [proposal revision manifest](../PROPOSALS.md).
