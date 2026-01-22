# Security Enhancement Plan: Server-Side Query Management

## Problem Statement

The current architecture has a security vulnerability: the frontend sends raw SQL queries to the backend API. While there's a regex check to ensure queries start with `SELECT`, this is insufficient:

1. **Arbitrary SQL Execution** - Any SELECT query can be executed against registered sources
2. **Query Manipulation** - Attackers can modify queries via browser dev tools
3. **No Query Whitelist** - No validation that a query is actually defined in a page

## Security Model

**Core insight**: Treat each `{% query %}` tag as a **named API endpoint** defined by the markdown file. The SQL is an implementation detail that stays on the backend, just like any REST API's database queries.

| Property | Guarantee |
|----------|-----------|
| No arbitrary SQL | Only predefined queries can execute |
| No SQL in API | Frontend sends `(page, name, params)` only |
| Param validation | Backend validates expected params, rejects others |
| Source isolation | Query runs against its declared source only |
| Template integrity | SQL template comes from trusted markdown file |

## Current Flow (Insecure)

```
1. Browser fetches /pages/index.md (raw markdown)
2. Frontend parses Markdoc, extracts queries with SQL
3. Frontend interpolates user inputs into SQL strings
4. Frontend sends POST /api/query { source: "orders", sql: "SELECT..." }
5. Backend validates: regex check for SELECT, source exists
6. Backend executes arbitrary SQL against DuckDB
```

## Proposed Flow (Secure)

```
1. Backend parses all markdown pages at startup, builds query registry
2. Browser fetches /pages/index.md (unchanged markdown)
3. Frontend parses Markdoc, extracts query names and param dependencies
4. Frontend sends POST /api/query { page: "/index.md", query: "monthly_sales", params: {...} }
5. Backend looks up query by (page, name), validates params
6. Backend interpolates params with escaping, executes predefined SQL
```

## Page Rendering Architecture

**What backend returns for page requests**: Raw markdown (unchanged)

```
GET /pages/sales.md

Response: Raw markdown content including {% query %} tags with SQL
```

**Frontend responsibilities**:
- Parse Markdoc using `@markdoc/markdoc` library
- Extract query definitions (names, sources, param dependencies)
- Render HTML with web components (`<lence-chart>`, `<lence-data-table>`, etc.)
- Call `/api/query` with `(page, query, params)` to fetch data
- Bind data to components

**Why keep Markdoc on frontend**:
1. **Simpler migration** - minimal changes to current architecture
2. **showSource works** - users can still see raw markdown
3. **Client-side reactivity** - input changes trigger re-queries without page reload
4. **Less backend complexity** - no need to render HTML server-side

**Alternative considered but deferred**: Backend could render to HTML with web components, removing need for frontend Markdoc parsing. This would be a larger architectural change for a future iteration.

```
# Current (and proposed) - Frontend parses Markdoc
GET /pages/sales.md → raw markdown → frontend parses → web components

# Future option - Backend renders HTML
GET /pages/sales.md → pre-rendered HTML with web components → frontend hydrates
```

## Solution Architecture

### Phase 1: Server-Side Markdoc Parsing

**Goal**: Parse Markdoc on the backend to extract and register queries.

**Implementation**:
1. Install markdoc-py: `uv pip install -e ../markdoc/markdoc-py`
2. Create `lence/backend/query_registry.py`:
   - Parse markdown files using markdoc-py
   - Extract all `{% query %}` tags with their attributes and SQL content
   - Extract parameter names from `${inputs.X.value}` patterns
   - Build registry mapping `(page_path, query_name)` → query definition

```python
from dataclasses import dataclass
import re
import markdocpy as Markdoc

@dataclass
class QueryDefinition:
    name: str           # "monthly_sales" - from markdown
    source: str         # "orders" - data source
    sql: str            # "SELECT ... WHERE category = '${inputs.category.value}'"
    params: list[str]   # ["category"] - extracted from ${inputs.X.value} patterns


def extract_text(node: Markdoc.Node) -> str:
    """Extract text content from a node and its children."""
    if node.content is not None:
        return node.content
    result = []
    for child in node.children:
        if isinstance(child, Markdoc.Node):
            result.append(extract_text(child))
    return "".join(result)


def extract_params(sql: str) -> list[str]:
    """Extract parameter names from ${inputs.X.value} patterns."""
    pattern = r"\${inputs\.(\w+)\.value}"
    return list(set(re.findall(pattern, sql)))


def parse_queries(content: str) -> list[QueryDefinition]:
    """Parse markdown content and extract query definitions."""
    ast = Markdoc.parse(content)
    return _extract_queries(ast)


def _extract_queries(node: Markdoc.Node) -> list[QueryDefinition]:
    """Walk AST and extract query definitions."""
    queries = []

    # Skip code blocks (don't parse tags in examples)
    if node.type in ("fence", "code", "code_block"):
        return queries

    if node.type == "tag" and node.tag == "query":
        name = node.attributes.get("name")
        source = node.attributes.get("source")
        sql = extract_text(node).strip()
        params = extract_params(sql)
        queries.append(QueryDefinition(name=name, source=source, sql=sql, params=params))

    for child in node.children:
        if isinstance(child, Markdoc.Node):
            queries.extend(_extract_queries(child))

    return queries


# Registry structure
registry: dict[str, dict[str, QueryDefinition]] = {
    "/sales.md": {
        "monthly_sales": QueryDefinition(...),
        "filtered_orders": QueryDefinition(...),
    },
    "/dashboard.md": {
        "metrics": QueryDefinition(...),
    }
}
```

### Phase 2: Secure Query API

**Goal**: New API endpoint that accepts query by name, not raw SQL.

**New API Endpoint**:
```
POST /api/query
{
  "page": "/sales.md",
  "query": "filtered_orders",
  "params": {
    "category": "electronics",
    "minPrice": 100
  }
}

Response:
{
  "columns": [...],
  "data": [...],
  "row_count": 123
}

Errors:
- 404: Query not found (page doesn't exist or query not defined on page)
- 400: Invalid parameters (missing, extra, or invalid values)
```

**Backend Implementation**:
```python
import re

def execute_query(page: str, query_name: str, params: dict) -> QueryResult:
    # 1. Lookup query
    page_queries = registry.get(page)
    if not page_queries:
        raise NotFound(f"Page not found: {page}")

    query = page_queries.get(query_name)
    if not query:
        raise NotFound(f"Query not found: {query_name} on {page}")

    # 2. Validate params match expected
    expected = set(query.params)
    received = set(params.keys())
    if expected != received:
        raise BadRequest(f"Expected params {expected}, got {received}")

    # 3. Interpolate with escaping (SQL template is trusted)
    sql = query.sql
    for name, value in params.items():
        placeholder = f"${{inputs.{name}.value}}"
        escaped = escape_sql_value(value)
        sql = sql.replace(placeholder, escaped)

    # 4. Execute against registered source
    db = get_source(query.source)
    return db.execute(sql)

def escape_sql_value(value) -> str:
    """Escape value for safe SQL interpolation."""
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    # String: escape single quotes
    return str(value).replace("'", "''")
```

### Phase 3: Parameter Extraction

**Goal**: Extract parameter names from SQL at parse time.

The `${inputs.X.value}` syntax is preserved in the SQL template. At parse time, we extract the parameter names using regex:

```python
import re

def extract_params(sql: str) -> list[str]:
    """Extract parameter names from ${inputs.X.value} patterns."""
    pattern = r'\$\{inputs\.(\w+)\.value\}'
    return list(set(re.findall(pattern, sql)))

# Example:
sql = "SELECT * FROM orders WHERE category = '${inputs.category.value}' AND price > ${inputs.minPrice.value}"
params = extract_params(sql)  # ["category", "minPrice"]
```

This handles all patterns including LIKE:
```sql
WHERE name LIKE '%${inputs.search.value}%'
-- params: ["search"]
-- At execution: '%electronics%' (value is interpolated, quotes preserved from template)
```

### Phase 4: Frontend Modifications

**Goal**: Frontend calls queries by name instead of sending SQL.

**Changes to `page.ts`**:

1. Keep current markdown parsing (unchanged)
2. Modify `executeQuery()` to use new API:

```typescript
// Old (insecure)
async function executeQuery(source: string, sql: string): Promise<QueryResult> {
  const response = await fetch('/api/query', {
    method: 'POST',
    body: JSON.stringify({ source, sql })
  });
  return response.json();
}

// New (secure)
async function executeQuery(
  page: string,
  queryName: string,
  params: Record<string, unknown>
): Promise<QueryResult> {
  const response = await fetch('/api/query', {
    method: 'POST',
    body: JSON.stringify({ page, query: queryName, params })
  });
  return response.json();
}
```

3. Collect param values from inputs at execution time:

```typescript
function getQueryParams(query: QueryDefinition, inputs: Map<string, Input>): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const paramName of query.params) {
    const input = inputs.get(paramName);
    params[paramName] = input?.value ?? null;
  }
  return params;
}
```

4. Remove client-side SQL interpolation (`interpolateSQL` function)

### Phase 5: Registry Management

**Goal**: Keep registry in sync with markdown files.

**Startup**:
```python
def build_registry(pages_dir: Path) -> Registry:
    registry = {}
    for md_file in pages_dir.glob("**/*.md"):
        page_path = "/" + md_file.relative_to(pages_dir).as_posix()
        queries = parse_queries(md_file.read_text())
        if queries:
            registry[page_path] = {q.name: q for q in queries}
    return registry
```

**Dev Mode** (file watching):
```python
def on_file_change(path: Path):
    page_path = "/" + path.relative_to(pages_dir).as_posix()
    queries = parse_queries(path.read_text())
    registry[page_path] = {q.name: q for q in queries}
```

---

## Implementation Tasks

### Backend Tasks

- [ ] Install markdoc-py and verify basic parsing works
- [ ] Create `lence/backend/query_registry.py`
  - [ ] `QueryDefinition` dataclass
  - [ ] `extract_params(sql)` - regex to find `${inputs.X.value}` patterns
  - [ ] `parse_queries(content)` - parse markdown, extract query tags
  - [ ] `build_registry(pages_dir)` - build registry from all pages
  - [ ] `escape_sql_value(value)` - safe escaping for interpolation
- [ ] Create new API endpoint in `lence/backend/sources.py`
  - [ ] Accept `{ page, query, params }` request format
  - [ ] Lookup query by (page, name)
  - [ ] Validate params match expected
  - [ ] Interpolate and execute
- [ ] Initialize registry on app startup
- [ ] Add file watcher for dev mode (rebuild on markdown changes)

### Frontend Tasks

- [ ] Modify `executeQuery()` signature: `(source, sql)` → `(page, query, params)`
- [ ] Update call sites to pass page path and collect params from inputs
- [ ] Remove `interpolateSQL()` function (no longer needed)
- [ ] Extract param names from query SQL (for knowing which inputs to watch)

### Testing

- [ ] Unit tests for `extract_params()`
- [ ] Unit tests for `escape_sql_value()`
- [ ] Unit tests for `parse_queries()`
- [ ] Integration test: query lookup by (page, name)
- [ ] Integration test: param validation (missing, extra params rejected)
- [ ] Security test: verify raw SQL API no longer works

---

## Migration Strategy

1. **Add new endpoint** `/api/query/v2` with secure implementation
2. **Update frontend** to use new endpoint
3. **Deprecate old endpoint** (log warnings)
4. **Remove old endpoint** in future release

---

## Security Considerations

### What We Prevent

| Attack | Mitigation |
|--------|------------|
| Arbitrary SQL execution | Only queries defined in pages can run |
| SQL template manipulation | Template comes from trusted markdown file |
| Unexpected params | Backend rejects params not in query definition |
| Source switching | Source comes from registry, not request |

### What We Rely On

1. **Trusted templates**: SQL in markdown files is written by developers, not users
2. **Escaping**: `escape_sql_value()` handles quotes and types properly
3. **Param validation**: Only expected params are accepted

### Escaping Implementation

The escaping is straightforward because the SQL template is trusted:

```python
def escape_sql_value(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    # String: escape single quotes (SQL standard)
    return str(value).replace("'", "''")
```

Edge cases handled by the template author:
- LIKE patterns: `'%${inputs.search.value}%'` - quotes in template
- Numeric context: `price > ${inputs.min.value}` - no quotes in template

---

## Open Questions

1. ~~**markdoc-py**: Need to verify it can parse and extract query tags~~ **RESOLVED** - verified working
2. **Error messages**: How verbose should errors be? (don't leak query details to attackers?)
3. **Caching**: Should we cache query results? (separate concern)

---

## Dependencies

- **markdoc-py**: Python port of Markdoc for server-side parsing
  - Location: `/Volumes/Dev/priv/markdoc/markdoc-py`
  - Install: `uv pip install -e ../markdoc/markdoc-py`
  - Already installed and tested - parsing and query extraction verified working

---

## Next Steps

1. Verify markdoc-py installation and test basic parsing
2. Implement `query_registry.py` with tests
3. Add new secure endpoint
4. Update frontend
5. Remove old endpoint
