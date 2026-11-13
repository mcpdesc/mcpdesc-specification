---
title: MCP Description Specification
version: 0.9.0
status: Stable release
release-tag: v0.9.0
released: true
baseline: 0.8.0
date: 2026-11-12
---

# MCP Description Specification

**Version**: 0.9.0 (Stable release; `v0.9.0`)

**Status**: Stable release prepared for publication; not yet tagged or published

**Baseline**: v0.8.0

**Date**: 2026-11-12

## Abstract

This specification defines the **MCP Description** format. It is a portable, machine-readable document that describes the durable, externally relevant surface of a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server.

An MCP Description declares the MCP protocol versions it covers, instructions, transports, security requirements, and capabilities. It also describes tools, resources, resource templates, prompts, and metadata.

It enables offline discovery and documentation generation. It also supports description validation, change analysis, testing, governance, and [interoperable tooling](../../implementations.md) across the MCP ecosystem.

## Status of This Document

This document defines the stable MCP Description 0.9.0 release and is prepared for tag `v0.9.0`. It has not yet been tagged or published. Until publication, 0.8.0 remains the published stable release.

This release:

- Adds protocol-version-specific views and conversion guidance, and a native MCP projection.
- Expands validation rules, rule-level results, and diagnostics.
- Clarifies MCP-aligned type constraints, integer values, and Tool schema dialects.
- Defines a normalized YAML presentation profile and clarifies YAML scalar resolution.

The proposals implemented in this release are listed in [`PROPOSALS.md`](../PROPOSALS.md).
