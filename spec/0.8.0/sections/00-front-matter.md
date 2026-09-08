---
title: MCP Description Specification
version: 0.8.0
status: Stable release
release-tag: v0.8.0
released: true
baseline: 0.7.0
baseline-snapshot: v0.8.0-draft.4
date: 2026-09-08
editors:
  - name: Cisco DevNet (v0.7.0 baseline)
    url: https://developer.cisco.com
  - name: Stève Sfartz (v0.8.0 draft)
    url: https://github.com/stsfartz
  - name: "{mcpdesc} community"
    url: https://github.com/mcpdesc/mcpdesc-specification
---

# MCP Description Specification

**Version**: 0.8.0

**Status**: Stable release

**Baseline**: v0.7.0

**Date**: 2026-09-08

## Abstract

This specification defines the **MCP Description** format — a portable, machine-readable document that describes the durable, externally relevant surface of a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server.

An MCP Description declares supported MCP protocol revisions, instructions, transports, security requirements, capabilities, tools, resources, resource templates, prompts, and metadata in a static, machine-readable document.

It enables offline discovery, documentation generation, description validation, change analysis, testing, governance, and [interoperable tooling](../../implementations.md) across the MCP ecosystem.

## Status of This Document

This document is the stable MCP Description v0.8.0 specification, identified by tag `v0.8.0`.

The proposal revisions that informed this release are recorded in the [proposal revision manifest](../PROPOSALS.md).
