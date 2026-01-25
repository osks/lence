# Data Sources

Configure data sources in `sources.yaml` at your project root.

## Basic Format

```yaml
sources:
  - table: orders
    type: csv
    path: ./sources/orders.csv

  - table: products
    type: parquet
    path: ./data/products.parquet
```

## Supported Types

| Type | Function | Description |
|------|----------|-------------|
| `csv` | `read_csv_auto()` | CSV files (local or remote) |
| `parquet` | `read_parquet()` | Parquet files |
| `json` | `read_json_auto()` | JSON files |

## Remote Sources

Sources can be URLs:

```yaml
sources:
  - table: remote_data
    type: csv
    path: https://example.com/data.csv
```

## Authentication

For authenticated HTTP sources, use `headers` with environment variables:

```yaml
sources:
  - table: api_data
    type: json
    path: https://api.example.com/data.json
    headers:
      Authorization: "Bearer ${API_TOKEN}"
```

Set the environment variable before running:

```bash
export API_TOKEN="your-secret-token"
lence edit
```

The `${VAR}` syntax is replaced with the environment variable value at startup.

## Using Sources in Pages

Define queries using sql fenced code blocks:

```` {% process=false %}
```sql recent_orders
SELECT * FROM orders
WHERE date > '2024-01-01'
ORDER BY date DESC
LIMIT 100
```

{% table data="recent_orders" /%}
````

The table name in SQL must match a `table` from your `sources.yaml`.
