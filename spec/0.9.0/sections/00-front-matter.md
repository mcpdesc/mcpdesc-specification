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

This specification defines the **MCP Description** format — a portable, machine-readable document that describes the durable, externally relevant surface of a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server.

An MCP Description declares supported MCP protocol versions, instructions, transports, security requirements, capabilities, tools, resources, resource templates, prompts, and metadata in a static, machine-readable document.

It enables offline discovery, documentation generation, description validation, change analysis, testing, governance, and [interoperable tooling](../../implementations.md) across the MCP ecosystem.

## Status of This Document

This document defines the stable MCP Description 0.9.0 release, prepared for tag `v0.9.0`. It includes the normalized YAML presentation profile, YAML scalar-resolution clarification, and the changes recorded in Proposals 0024–0036. It has not yet been tagged or published; the published stable release remains 0.8.0 until publication. Downstream default adoption and publication on `mcpdesc.org` are coordinated separately.

The exact proposal revisions represented in this release are recorded in the [proposal revision manifest](../PROPOSALS.md).
