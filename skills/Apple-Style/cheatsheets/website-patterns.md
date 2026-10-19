# Website patterns

Scope: [rule strength and evidence](rules-and-evidence.md). Read [website.md](website.md) first for loading, budgets and verification.

No patterns are written yet. They are added by plan items 2.1–2.14 of the website-first plan in the repository (`docs/plan/`): header, narrow navigation, footer, hero and display type, page sections, pricing tables, FAQ, article layout, lists, forms, error and legal pages, images and diagrams, and scroll motion. Each pattern will follow the template below, and its reference CSS will live in `web/patterns/` and use tokens only.

## Template

Every pattern uses these headings, in this order.

### Pattern name

- **When:** the page types and content where the pattern applies, and when it does not.
- **Structure:** the minimal HTML, with landmarks and roles.
- **Accessibility contract:** the keyboard model, focus behavior, accessible names and states the markup must provide.
- **Responsive:** what changes at 320 px, at tablet width and on wide screens.
- **Source level:** one of *official requirement*, *official recommendation*, *project default* or *observed convention* (with the date observed). An observed convention is not a requirement. Do not copy brand assets, product names or copy.
- **Verify:** the checks to run and the evidence to record, as in [Apple-Style-Review](../../Apple-Style-Review/SKILL.md).
