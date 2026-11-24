# CodeMode — v0.2.0 (experimental)

A small native Claude Code Mod for learning and discussing code in the **existing prompt box**, not a browser extension, external editor or code runner. No dependencies, file writes, network requests, telemetry or model calls from the mod itself.

## Languages

Python, JavaScript, TypeScript and PHP. Includes basic syntax highlighting, automatic language detection and indentation. Python and PHP use four spaces; JS/TS use two.

## Install from GitHub (experimental)

Inside Claude Code:

```text
/plugin marketplace add miladsoor/CodeMode
/plugin install codemode@codemode-marketplace
/reload-plugins
```

These are intended installation commands; interactive installation is not yet verified.

## Local development

Use Claude Code CLI 2.1.323 or newer. From the directory containing the cloned repository:

```sh
claude plugin validate ./CodeMode --strict
claude --plugin-dir ./CodeMode
```

Try `/code php` (or `/codemode php` if `/code` is taken). Use `/codemode off` to disable syntax/indentation and paste activation. A terminal-only button above the native prompt toggles CodeMode. `/codemode auto`, `/codemode python`, `/codemode js`, `/codemode ts` and `/codemode plain` also work. A recognized multiline code paste into an empty prompt may enable CodeMode when Claude exposes the paste as a prompt edit; folded paste placeholders cannot be inspected. No code is executed.

## Keyboard shortcuts

The plugin does not overwrite your keybindings. By default, use Ctrl+J to insert a newline. To make Enter insert a newline and Ctrl+Enter submit, merge the Chat block from `keybindings.example.json` into `~/.claude/keybindings.json` (use `/keybindings` to edit it). Keep any existing bindings. This is a **global Chat context setting**, not restricted to CodeMode; turn it off by removing the two custom mappings and restoring any previous mappings. Ctrl+Enter may not be distinguishable from Enter in all terminals. Check that the chosen bindings work before entering important text.

Tab is controlled by Claude Code's own completion/focus behavior; if a literal tab arrives at `prompt.edit` the mod converts it into spaces. Tab/Shift+Tab cannot be guaranteed to indent/outdent. Use spaces otherwise.

## Scope and known limitations

- Simple regex highlighting and indentation heuristics, not a full parser or language server. No automatic dedent. PHP supports basic tags, variables, keywords, strings and comments; mixed HTML and heredoc are not fully parsed.
- Automatic language detection is conservative and may miss short snippets or mistake prose for code. Explicit selection is recommended.
- Native prompt decoration is surface/version dependent; only the terminal is the target of this release. No claim of Claude.ai chat or Desktop support. The mod does not change the native prompt's underlying keyboard handler. Undo/history and folded pastes may temporarily lose highlighting until the next edit.
- Unit tests cover pure logic and a simulated hook. Claude CLI validation and interactive compatibility have NOT been verified. The example keyboard configuration is optional and not installed by the mod.

## Tests

```sh
node --test tests/editor.test.mjs
```

Interactive acceptance checklist: run the strict validator; confirm both commands and toggle; type Python `def greet():` then Ctrl+J; ensure four spaces; inspect syntax colors; try `/codemode php` then type `function greet($name) {` and Ctrl+J; paste a short snippet; verify a normal prompt remains unchanged after `/codemode off`; verify configured Enter/Ctrl+Enter in your terminal; confirm the mod never initiates a model turn by itself.

## Status

Public experimental open-source project, MIT license. Not yet submitted to or approved by Anthropic. Maintainer: miladsoor.

## References

- https://code.claude.com/docs/en/plugins/mods/overview
- https://code.claude.com/docs/en/plugins/mods/reference
- https://code.claude.com/docs/en/plugins/mods/interface
- https://github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts
- https://code.claude.com/docs/en/keybindings
- https://code.claude.com/docs/en/plugins/publish
