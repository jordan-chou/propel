# Component libraries

The **Insert component** command accepts versioned JSON libraries. JSON was chosen because it is portable, readable in source control, supported directly by browsers, and can be validated before templates reach the document.

Place the cursor in Live or Code view, open the command, choose a component, and use **Preview** before inserting it. Propel inserts the snippet at the captured cursor position without replacing highlighted content. Tables remain convertible from the Live view hover action and from **Convert current table to component** in the table editor. An import replaces the active custom library and stores it in the current browser. Export downloads that active library. The Propel starter library remains the fallback if no valid custom library is stored.

## Format

Each template must contain exactly one `{{content}}` slot. For insertion and its preview, Propel replaces that slot with an editable placeholder paragraph. For table conversion, the converted table content supplies the slot.

Built-in components may also declare a `conversion` mode. During insertion, these modes populate the corresponding `{{heading}}`, `{{author}}`, `{{citation}}`, `{{image}}`, `{{figureOne}}`, and `{{figureTwo}}` template slots with starter labels and placeholder markup. During table conversion, `heading-content` promotes the first table cell or heading, `quote` maps the first three cells to quote/author/citation, and the chart modes lift images and metadata while leaving an editable placeholder for each text version. Source-table content is not copied into chart text versions, and highlighted Live or Code content is never transformed.

Built-in heading, chart, text-version, author, citation, and content placeholders follow Propel’s current English or French command language.

```json
{
  "format": "propel-component-library",
  "version": 1,
  "name": "My publishing components",
  "components": [
    {
      "id": "notice",
      "name": "Notice",
      "description": "A neutral notice for supporting information.",
      "template": "<aside class=\"well well-sm\">\n{{content}}\n</aside>"
    }
  ]
}
```

Component IDs must be unique and may contain letters, numbers, dots, underscores, and hyphens. `description` is optional. The format rejects scripts, embedded documents, inline event handlers, and JavaScript URLs; libraries define markup, not executable behavior.

Future incompatible formats will use a new integer `version`. Propel currently accepts version `1` only.
