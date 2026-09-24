# Form

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

Paste rough text and watch it become a structured, editable document.

## Capabilities and Constraints

A TypeSafe Jev key is configured locally on the server. Jev judges block boundaries and roles from the full source text. BlockNote presents the result as editable blocks. Users can compare the original and copy the edited document as Markdown. Formatting preserves source wording, including literal Markdown markers. Automatic table and media construction is outside the current flow.

## Stack

React, TypeScript, Vite, Motion, BlockNote, and Fastify. Local development first.

## Users

People with unstructured notes, drafts, lists, or conversations who want an editable document without arranging every block manually.

## Product Principles

- Keep the paste surface minimal.
- Let Jev decide semantic structure.
- Preserve source wording and make the result editable.
- Keep credentials server-side.
