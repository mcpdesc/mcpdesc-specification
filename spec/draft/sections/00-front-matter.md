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
  - name: "{mcpdesc} community"
    url: https://github.com/mcpdesc/mcpdesc-specification
---

# MCP Description Specification

**Version**: 0.8.0 (community working draft)

**Status**: Community working draft — not released

**Baseline**: v0.7.0 (the normative content below currently tracks the v0.7.0 baseline pending v0.8.0 changes)

**Date**: 2026-07-28

## Abstract

This specification defines the **MCP Description** format — a portable, machine-readable document that describes the capabilities of a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server.

An MCP Description declares the tools, resources, prompts, transports, security requirements, and metadata of an MCP server in a static JSON document, enabling offline discovery, documentation generation, contract validation, and [interoperable tooling](../../implementations.md) across the MCP ecosystem.

## Status of This Document

This document is the **community working draft** for MCP Description v0.8.0. It is **not** a released specification. Its normative content currently tracks the stable v0.7.0 baseline and will change as v0.8.0 proposals are accepted. The current stable release is v0.7.0, whose canonical source remains the Cisco Open `mcptoolkit-contract` repository.

