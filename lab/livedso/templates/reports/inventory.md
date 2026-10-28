# LiveAtelier · Token Inventory

> Vault: `{{vault.name}}` ｜ {{counts.tokens}} tokens（deprecated {{counts.deprecated}}）

{{#tokens}}
- `{{path}}` — {{resolved}}{{#if deprecated}} · **deprecated**{{#if replacedBy}} → `{{replacedBy}}`{{/if}}{{/if}}
{{/tokens}}
