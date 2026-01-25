# Query Syntax Simplification Plan

## Overview

Simplify query definition syntax and remove redundant `source` attribute from queries.

**Before:**
```markdown
{% query name="summary" source="orders" %}
SELECT * FROM orders WHERE amount > 100
{% /query %}

{% dataTable data="summary" /%}
```

**After:**
````markdown
```sql summary
SELECT * FROM orders WHERE amount > 100
```

{% dataTable data="summary" /%}
````

## Changes

### 1. Source Configuration (`sources.yaml`)

Add explicit `table` option for file-based sources.

**Before:**
```yaml
sources:
  - id: orders
    type: csv
    path: ./sources/orders.csv
```

**After:**
```yaml
sources:
  - type: csv
    path: ./sources/orders.csv
    table: orders
    description: Order transactions  # optional
```

**Changes:**
- Remove `id` field entirely
- Add required `table` field - the DuckDB table name

**Files:**
- `lence/backend/config.py` - Update `DataSource` model: remove `id`, add required `table`
- `lence/backend/database.py` - Use `table` field when loading sources

### 2. Query Extraction (Frontend)

Parse SQL queries from fenced code blocks instead of `{% query %}` tags.

**Syntax:**
````markdown
```sql query_name
SELECT * FROM orders
```
````

**Parsing the info string:**
- Language: `sql`
- Query name: everything after `sql ` (e.g., `query_name`)

**Files:**
- `lence/frontend/markdoc/index.ts`:
  - Update `extractQueries()` to find `fence` nodes with `sql` language
  - Parse query name from info string
  - Remove `source` from `QueryDefinition` type
  - Keep `{% query %}` support during transition (optional)

### 3. Query Extraction (Backend)

Update backend query registry to parse fence syntax.

**Files:**
- `lence/backend/query_registry.py`:
  - Update `parse_queries()` to find sql fences
  - Remove `source` field from `QueryDefinition`
  - Update regex/parsing logic

### 4. Query Execution

Remove source validation from query execution since SQL specifies tables directly.

**Files:**
- `lence/backend/sources.py`:
  - Remove `source` field from `QueryRequest`
  - Remove source existence check
  - Just execute the SQL (DuckDB errors if table missing)

### 5. Frontend Types

Update TypeScript types.

**Files:**
- `lence/frontend/types.ts` - Remove `source` from `QueryRequest`
- `lence/frontend/api.ts` - Update `executeQuery()` signature
- `lence/frontend/markdoc/index.ts` - Update `QueryDefinition`

### 6. Documentation

Update all docs to use new syntax.

**Files:**
- `lence/pages/_docs/project-structure.md`
- `lence/pages/_docs/sources.md`
- `lence/pages/_docs/components/*.md` - Update examples
- `example/pages/*.md` - Update example pages
- `CLAUDE.md` - Update syntax examples

### 7. Tests

Update tests for new syntax.

**Files:**
- `lence/backend/tests/test_query_registry.py`
- `lence/frontend/markdoc/__tests__/markdoc.test.ts`
- `lence/frontend/__tests__/api.test.ts`

## Implementation Order

1. **Backend config** - Remove `id`, add required `table` field to sources
2. **Backend query registry** - Parse fence syntax, remove source field
3. **Backend API** - Remove source from query request/validation
4. **Frontend markdoc** - Parse fence syntax, add fence transform to hide query fences
5. **Frontend API** - Update executeQuery signature (remove source)
6. **Remove `{% query %}` tag** - Delete from Markdoc config
7. **Tests** - Update all tests
8. **Docs & examples** - Update to new syntax

## Notes

- No backward compatibility needed - remove `{% query %}` entirely
- `table` field is required in source config (no default from filename)
- SQL fences are hidden from page output (same as current `{% query %}` behavior)
  - Requires custom fence transform in Markdoc config to return `null` for sql query fences
