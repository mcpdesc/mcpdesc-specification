---
title: MCP Description Specification
version: 0.8.0
status: Community working draft
released: false
baseline: 0.7.0
date: 2026-07-28
editors:
  - name: Cisco DevNet (v0.7.0 baseline)
    url: https://developer.cisco.com
  - name: Stève Sfartz (v0.8.0 draft)
    url: https://github.com/stsfartz
  - name: "{mcpdesc} community"
    url: https://github.com/mcpdesc/mcpdesc-specification
---

# MCP Description Specification

**Version**: 0.8.0 (community working draft)

**Status**: Community working draft — not released

**Baseline**: v0.7.0

**Date**: 2026-07-28

## Abstract

This specification defines the **MCP Description** format — a portable, machine-readable document that describes the durable, externally relevant surface of a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server.

An MCP Description declares supported MCP protocol revisions, instructions, transports, security requirements, capabilities, tools, resources, resource templates, prompts, and metadata in a static JSON document. It enables offline discovery, documentation generation, description validation, change analysis, testing, governance, and [interoperable tooling](../../implementations.md) across the MCP ecosystem.

## Status of This Document

This document is the **community working draft** for MCP Description v0.8.0. It is **not** a released specification and may change during implementation and interoperability testing. The current stable release is v0.7.0, whose canonical source remains the Cisco Open `mcptoolkit-contract` repository.

