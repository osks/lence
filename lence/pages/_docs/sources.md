# Data Sources

Configure data sources in `sources.yaml` at your project root.

## Query Engine

Lence uses [DuckDB](https://duckdb.org/) as its query engine. All SQL queries use DuckDB syntax, which is PostgreSQL-compatible with additional features:

- Modern SQL syntax (e.g., `SELECT * EXCLUDE (column)`)
- Built-in functions for dates, strings, and aggregations
- Direct querying of CSV, Parquet, and JSON files
- Window functions, CTEs, and complex joins

See the [DuckDB SQL documentation](https://duckdb.org/docs/sql/introduction) for full syntax reference.

## File Sources

For CSV, Parquet, and JSON files:

```yaml
sources:
  - table: orders
    type: csv
    path: ./data/orders.csv

  - table: products
    type: parquet
    path: ./data/products.parquet

  - table: config
    type: json
    path: ./data/config.json
```

| Field | Required | Description |
|-------|----------|-------------|
| `table` | yes | Table name to use in SQL queries |
| `type` | yes | `csv`, `parquet`, or `json` |
| `path` | yes | Local file path or HTTP(S) URL |
| `headers` | no | HTTP headers for remote files |

### Remote Files

```yaml
sources:
  - table: remote_data
    type: csv
    path: https://example.com/data.csv
```

### Authentication

For authenticated HTTP sources, use `headers` with environment variables:

```yaml
sources:
  - table: api_data
    type: json
    path: https://api.example.com/data.json
    headers:
      Authorization: "Bearer ${API_TOKEN}"
```

The `${VAR}` syntax is replaced with the environment variable value at startup.

## Database Sources

Connect to external databases (PostgreSQL, MySQL, SQLite):

```yaml
sources:
  - db: prod    # → SELECT * FROM prod.users
    type: postgres
    connection: dbname=mydb user=postgres host=127.0.0.1
    schema: public
```

| Field | Required | Description |
|-------|----------|-------------|
| `db` | yes | Name for this database in SQL (use as `db.tablename`) |
| `type` | yes | `postgres`, `mysql`, or `sqlite` |
| `connection` | yes | Database connection string |
| `schema` | no | Which database schema to expose |

Environment variables work in connection strings:

```yaml
sources:
  - db: prod
    type: postgres
    connection: dbname=mydb user=${DB_USER} password=${DB_PASS} host=${DB_HOST}
```

### Querying Database Tables

Use `db` as a prefix:

```` {% process=false %}
```sql active_users
SELECT * FROM prod.users
WHERE active = true
```

{% datatable data="{active_users}" /%}
````

Database sources are attached as read-only.

## Using Sources in Pages

Define queries using sql fenced code blocks:

```` {% process=false %}
```sql recent_orders
SELECT * FROM orders
WHERE date > '2024-01-01'
ORDER BY date DESC
LIMIT 100
```

{% datatable data="{recent_orders}" /%}
````

For file sources, the table name in SQL matches the `table` field.
For database sources, use `db.tablename` format.

## Shared Queries

For queries used across multiple pages, define them as SQL files in a `queries/` directory:

```sql
-- queries/monthly_sales.sql
SELECT
  strftime(date, '%Y-%m') as month,
  SUM(amount) as total
FROM orders
GROUP BY 1
```

Configure the queries directory in `sources.yaml`:

```yaml
sources:
  - table: orders
    type: csv
    path: data/orders.csv

queries: queries/
```

Then use in any page:

```` {% process=false %}
{% line_chart data="{monthly_sales}" /%}
````

### File Naming

Query files are auto-discovered recursively. The path relative to the queries directory (without `.sql`) becomes the query name.

**Valid filenames** match `[a-z][a-z0-9_]*\.sql`:
- `monthly_sales.sql` → `{monthly_sales}`
- `top_10_products.sql` → `{top_10_products}`

**Subdirectories** are included in the query name:
- `orders/active.sql` → `{orders/active}`
- `reports/sales/by_region.sql` → `{reports/sales/by_region}`

**Ignored files** (with warning):
- `_draft.sql` - starts with underscore (use this to exclude drafts)
- `My Report.sql` - spaces or capitals
- `top-products.sql` - hyphens not allowed
- `123_report.sql` - must start with letter

### Parameters

Shared queries support parameters just like inline queries:

```sql
-- queries/orders_by_category.sql
SELECT * FROM orders
WHERE category LIKE '${inputs.category.value}'
```

```markdown {% process=false %}
{% dropdown id="category" options="..." /%}
{% datatable data="{orders_by_category}" /%}
```

See [Project Structure](/_docs/project-structure) for recommended folder layout.
