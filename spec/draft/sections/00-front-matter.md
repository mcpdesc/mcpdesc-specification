---
title: MCP Description Specification
version: 0.9.0
status: Community working draft 4
draft-iteration: 4
snapshot-tag: v0.9.0-draft.4
released: false
baseline: 0.8.0
date: 2026-10-31
---

# MCP Description Specification

**Version**: 0.9.0 (community working draft 4; `v0.9.0-draft.4`)

**Status**: Community working draft 4 — not released

**Baseline**: v0.8.0

**Date**: 2026-10-31

## Abstract

This specification defines the **MCP Description** format — a portable, machine-readable document that describes the durable, externally relevant surface of a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server.

An MCP Description declares supported MCP protocol revisions, instructions, transports, security requirements, capabilities, tools, resources, resource templates, prompts, and metadata in a static, machine-readable document.

It enables offline discovery, documentation generation, description validation, change analysis, testing, governance, and [interoperable tooling](../../implementations.md) across the MCP ecosystem.

## Status of This Document

This document is Community Working Draft 4 of MCP Description v0.9.0, prepared for the prerelease tag `v0.9.0-draft.4`. It is not a stable release and may change incompatibly before release. The current stable release is MCP Description v0.8.0.

The proposal revisions represented in this draft are recorded in the [proposal revision manifest](../PROPOSALS.md).
