"""Tests for query_registry module."""

from lence.backend.query_registry import (
    QueryDefinition,
    QueryRegistry,
    escape_sql_value,
    extract_params,
    parse_queries,
)


class TestExtractParams:
    """Tests for extract_params function."""

    def test_extracts_single_param(self):
        sql = "SELECT * FROM orders WHERE category = '${inputs.category.value}'"
        assert extract_params(sql) == ["category"]

    def test_extracts_multiple_params(self):
        sql = (
            "SELECT * FROM orders WHERE category = '${inputs.category.value}' "
            "AND price > ${inputs.minPrice.value}"
        )
        params = extract_params(sql)
        assert set(params) == {"category", "minPrice"}

    def test_no_params(self):
        sql = "SELECT * FROM orders"
        assert extract_params(sql) == []

    def test_like_pattern(self):
        sql = "SELECT * FROM products WHERE name LIKE '%${inputs.search.value}%'"
        assert extract_params(sql) == ["search"]

    def test_duplicate_params(self):
        sql = "SELECT * FROM orders WHERE a = '${inputs.x.value}' OR b = '${inputs.x.value}'"
        # Should deduplicate
        assert extract_params(sql) == ["x"]


class TestEscapeSqlValue:
    """Tests for escape_sql_value function."""

    def test_string_value(self):
        assert escape_sql_value("hello") == "hello"

    def test_string_with_quote(self):
        assert escape_sql_value("it's") == "it''s"

    def test_string_with_multiple_quotes(self):
        assert escape_sql_value("it's a 'test'") == "it''s a ''test''"

    def test_integer(self):
        assert escape_sql_value(42) == "42"

    def test_float(self):
        assert escape_sql_value(3.14) == "3.14"

    def test_boolean_true(self):
        assert escape_sql_value(True) == "TRUE"

    def test_boolean_false(self):
        assert escape_sql_value(False) == "FALSE"

    def test_none(self):
        assert escape_sql_value(None) == "NULL"


class TestParseQueries:
    """Tests for parse_queries function."""

    def test_simple_query(self):
        content = """
# Page

```sql orders
SELECT * FROM orders
```
"""
        queries = parse_queries(content)
        assert len(queries) == 1
        assert queries[0].name == "orders"
        assert queries[0].sql == "SELECT * FROM orders"
        assert queries[0].params == []

    def test_query_with_params(self):
        content = """
```sql filtered
SELECT * FROM orders WHERE category = '${inputs.category.value}'
```
"""
        queries = parse_queries(content)
        assert len(queries) == 1
        assert queries[0].name == "filtered"
        assert queries[0].params == ["category"]

    def test_multiple_queries(self):
        content = """
```sql q1
SELECT 1
```

```sql q2
SELECT 2
```
"""
        queries = parse_queries(content)
        assert len(queries) == 2
        assert queries[0].name == "q1"
        assert queries[1].name == "q2"

    def test_skip_regular_sql_fence(self):
        content = """
```sql
SELECT * FROM example
```
"""
        queries = parse_queries(content)
        # Regular sql fence without query name should not be extracted
        assert len(queries) == 0

    def test_self_closing_tag_not_query(self):
        content = """
{% chart data="sales" type="line" /%}
"""
        queries = parse_queries(content)
        assert len(queries) == 0


class TestQueryRegistry:
    """Tests for QueryRegistry class."""

    def test_get_existing_query(self):
        registry = QueryRegistry()
        registry._registry = {
            "/page.md": {
                "orders": QueryDefinition(
                    name="orders",
                    sql="SELECT * FROM orders",
                    params=[],
                )
            }
        }

        query = registry.get("/page.md", "orders")
        assert query is not None
        assert query.name == "orders"

    def test_get_nonexistent_query(self):
        registry = QueryRegistry()
        registry._registry = {}

        query = registry.get("/page.md", "orders")
        assert query is None

    def test_get_nonexistent_page(self):
        registry = QueryRegistry()
        registry._registry = {
            "/other.md": {
                "orders": QueryDefinition(
                    name="orders",
                    sql="SELECT * FROM orders",
                    params=[],
                )
            }
        }

        query = registry.get("/page.md", "orders")
        assert query is None

    def test_interpolate_sql(self):
        registry = QueryRegistry()
        query = QueryDefinition(
            name="filtered",
            sql="SELECT * FROM orders WHERE category = '${inputs.category.value}'",
            params=["category"],
        )

        result = registry.interpolate_sql(query, {"category": "electronics"})
        assert result == "SELECT * FROM orders WHERE category = 'electronics'"

    def test_interpolate_sql_with_quote(self):
        registry = QueryRegistry()
        query = QueryDefinition(
            name="filtered",
            sql="SELECT * FROM orders WHERE name = '${inputs.name.value}'",
            params=["name"],
        )

        result = registry.interpolate_sql(query, {"name": "it's"})
        assert result == "SELECT * FROM orders WHERE name = 'it''s'"

    def test_interpolate_sql_numeric(self):
        registry = QueryRegistry()
        query = QueryDefinition(
            name="filtered",
            sql="SELECT * FROM orders WHERE price > ${inputs.minPrice.value}",
            params=["minPrice"],
        )

        result = registry.interpolate_sql(query, {"minPrice": 100})
        assert result == "SELECT * FROM orders WHERE price > 100"

    def test_get_page_queries(self):
        registry = QueryRegistry()
        q1 = QueryDefinition(name="q1", sql="SELECT 1", params=[])
        q2 = QueryDefinition(name="q2", sql="SELECT 2", params=[])
        registry._registry = {"/page.md": {"q1": q1, "q2": q2}}

        queries = registry.get_page_queries("/page.md")
        assert len(queries) == 2
        assert "q1" in queries
        assert "q2" in queries

    def test_get_page_queries_nonexistent(self):
        registry = QueryRegistry()
        registry._registry = {}

        queries = registry.get_page_queries("/page.md")
        assert queries == {}
