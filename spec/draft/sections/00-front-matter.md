---
title: MCP Description Specification
version: 0.8.0
status: Community working draft 4
draft-iteration: 4
snapshot-tag: v0.8.0-draft.4
released: false
baseline: 0.7.0
date: 2026-08-28
editors:
  - name: Cisco DevNet (v0.7.0 baseline)
    url: https://developer.cisco.com
  - name: Stève Sfartz (v0.8.0 draft)
    url: https://github.com/stsfartz
  - name: "{mcpdesc} community"
    url: https://github.com/mcpdesc/mcpdesc-specification
---

# MCP Description Specification

**Version**: 0.8.0 (community working draft 4; `v0.8.0-draft.4`)

**Status**: Community working draft 4 — not released

**Baseline**: v0.7.0

**Date**: 2026-08-28

## Abstract

This specification defines the **MCP Description** format — a portable, machine-readable document that describes the durable, externally relevant surface of a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server.

An MCP Description declares supported MCP protocol revisions, instructions, transports, security requirements, capabilities, tools, resources, resource templates, prompts, and metadata in a static, machine-readable document. It enables offline discovery, documentation generation, description validation, change analysis, testing, governance, and [interoperable tooling](../../implementations.md) across the MCP ecosystem.

## Status of This Document

This document is **Community Working Draft 4** for MCP Description v0.8.0, identified by snapshot tag `v0.8.0-draft.4`. The snapshot label does not change the `mcpdesc` conformance version from `0.8.0`. This is **not** a released specification and may change during proposal review, implementation, and interoperability testing. The current stable release is v0.7.0, whose canonical source remains the Cisco Open `mcptoolkit-contract` repository. The exact review-stage proposal revisions represented by this draft are recorded in the [proposal revision manifest](../PROPOSALS.md).

