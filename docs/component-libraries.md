# Component libraries

The **Convert to component** command accepts versioned JSON libraries. JSON was chosen because it is portable, readable in source control, supported directly by browsers, and can be validated before templates reach the document.

Select text or HTML in Live or Code view, open the command, choose a component, and use **Preview** before converting. An import replaces the active custom library and stores it in the current browser. Export downloads that active library. The Propel starter library remains the fallback if no valid custom library is stored.

## Format

Each template must contain exactly one `{{content}}` slot. The selected HTML replaces that slot without being escaped, so elements selected in Code view remain elements.

Built-in components may also declare a `conversion` mode. `heading-content` promotes the first table cell or heading, `quote` maps the first three cells to quote/author/citation, and the chart modes lift images while retaining the source table as an accessible text version. Custom libraries may use these modes and the corresponding `{{heading}}`, `{{author}}`, `{{citation}}`, `{{image}}`, `{{figureOne}}`, and `{{figureTwo}}` template slots.

Structural detection is language-neutral and does not search for English keywords. When content does not supply a label, built-in heading, chart, text-version, author, and citation defaults follow Propel’s current English or French command language.

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
