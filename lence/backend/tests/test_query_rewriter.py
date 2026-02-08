"""Tests for query rewriter."""

from pathlib import Path

from lence.backend.config import DataSource
from lence.backend.query_rewriter import rewrite_query


class TestRewriteQuery:
    """Tests for rewrite_query function."""

    def test_simple_table_replacement(self):
        """Table name is replaced with read_csv_auto."""
        sources = {
            "orders": DataSource(type="csv", table="orders", path="data/orders.csv"),
        }
        sql = "SELECT * FROM orders"
        rewritten, params = rewrite_query(sql, sources, {}, Path("/project"))

        assert "read_csv_auto" in rewritten.lower()
        assert "/project/data/orders.csv" in rewritten
        assert params == []

    def test_parquet_source(self):
        """Parquet sources use read_parquet."""
        sources = {
            "sales": DataSource(type="parquet", table="sales", path="data/sales.parquet"),
        }
        sql = "SELECT * FROM sales"
        rewritten, params = rewrite_query(sql, sources, {}, Path("/project"))

        assert "read_parquet" in rewritten.lower()
        assert "sales.parquet" in rewritten

    def test_json_source(self):
        """JSON sources use read_json_auto."""
        sources = {
            "config": DataSource(type="json", table="config", path="data/config.json"),
        }
        sql = "SELECT * FROM config"
        rewritten, params = rewrite_query(sql, sources, {}, Path("/project"))

        assert "read_json_auto" in rewritten.lower()
        assert "config.json" in rewritten

    def test_input_parameterization(self):
        """Input references are converted to parameters."""
        sources = {}
        sql = "SELECT * FROM foo WHERE category LIKE '${inputs.cat.value}'"
        rewritten, params = rewrite_query(sql, sources, {"cat": "Books"})

        assert "${inputs" not in rewritten
        assert "$1" in rewritten
        assert params == ["Books"]

    def test_multiple_inputs(self):
        """Multiple inputs are parameterized in order."""
        sources = {}
        sql = """
            SELECT * FROM foo
            WHERE category = '${inputs.cat.value}'
            AND status = '${inputs.status.value}'
        """
        rewritten, params = rewrite_query(sql, sources, {"cat": "Books", "status": "active"})

        assert "$1" in rewritten
        assert "$2" in rewritten
        assert params == ["Books", "active"]

    def test_database_source_not_rewritten(self):
        """Database sources (postgres/mysql/sqlite) are not rewritten."""
        sources = {
            "prod": DataSource(
                type="postgres",
                db="prod",
                connection="dbname=test",
            ),
        }
        sql = "SELECT * FROM prod.users"
        rewritten, params = rewrite_query(sql, sources, {})

        # Should remain as qualified name, not rewritten
        assert "prod" in rewritten
        assert "read_" not in rewritten

    def test_unknown_table_unchanged(self):
        """Tables not in sources are left unchanged."""
        sources = {}
        sql = "SELECT * FROM unknown_table"
        rewritten, params = rewrite_query(sql, sources, {})

        assert "unknown_table" in rewritten
        assert "read_" not in rewritten

    def test_remote_url_source(self):
        """Remote URLs are used as-is."""
        sources = {
            "remote": DataSource(
                type="csv",
                table="remote",
                path="https://example.com/data.csv",
            ),
        }
        sql = "SELECT * FROM remote"
        rewritten, params = rewrite_query(sql, sources, {})

        assert "https://example.com/data.csv" in rewritten

    def test_combined_table_and_params(self):
        """Both table replacement and parameterization work together."""
        sources = {
            "products": DataSource(type="csv", table="products", path="products.csv"),
        }
        sql = "SELECT * FROM products WHERE category LIKE '${inputs.cat.value}'"
        rewritten, params = rewrite_query(sql, sources, {"cat": "%"}, Path("/data"))

        assert "read_csv_auto" in rewritten.lower()
        assert "$1" in rewritten
        assert params == ["%"]

    def test_table_with_alias(self):
        """Table with alias is replaced correctly."""
        sources = {
            "orders": DataSource(type="csv", table="orders", path="orders.csv"),
        }
        sql = "SELECT o.id, o.total FROM orders o WHERE o.total > 100"
        rewritten, params = rewrite_query(sql, sources, {}, Path("/data"))

        assert "read_csv_auto" in rewritten.lower()
        assert "orders.csv" in rewritten
        # Alias should be preserved
        assert "o.id" in rewritten or "O.ID" in rewritten.upper()

    def test_join_multiple_tables(self):
        """Multiple tables in JOIN are replaced."""
        sources = {
            "orders": DataSource(type="csv", table="orders", path="orders.csv"),
            "products": DataSource(type="parquet", table="products", path="products.parquet"),
        }
        sql = """
            SELECT o.id, p.name
            FROM orders o
            JOIN products p ON o.product_id = p.id
        """
        rewritten, params = rewrite_query(sql, sources, {}, Path("/data"))

        assert "read_csv_auto" in rewritten.lower()
        assert "read_parquet" in rewritten.lower()
        assert "orders.csv" in rewritten
        assert "products.parquet" in rewritten

    def test_join_preserves_aliases(self):
        """Table aliases are preserved after rewriting."""
        sources = {
            "orders": DataSource(type="csv", table="orders", path="orders.csv"),
            "products": DataSource(type="csv", table="products", path="products.csv"),
        }
        sql = """
            SELECT p.name, SUM(o.quantity) as total
            FROM orders o
            JOIN products p ON o.product_id = p.product_id
            GROUP BY p.name
        """
        rewritten, params = rewrite_query(sql, sources, {}, Path("/data"))

        # Aliases must be preserved for the query to work
        assert " AS o" in rewritten or " o " in rewritten or ") o" in rewritten.lower()
        assert " AS p" in rewritten or " p " in rewritten or ") p" in rewritten.lower()

    def test_subquery(self):
        """Table in subquery is replaced."""
        sources = {
            "orders": DataSource(type="csv", table="orders", path="orders.csv"),
        }
        sql = "SELECT * FROM (SELECT id, total FROM orders WHERE total > 100) sub"
        rewritten, params = rewrite_query(sql, sources, {}, Path("/data"))

        assert "read_csv_auto" in rewritten.lower()
        assert "orders.csv" in rewritten

    def test_cte(self):
        """Table in CTE is replaced."""
        sources = {
            "orders": DataSource(type="csv", table="orders", path="orders.csv"),
        }
        sql = """
            WITH high_value AS (
                SELECT * FROM orders WHERE total > 1000
            )
            SELECT * FROM high_value
        """
        rewritten, params = rewrite_query(sql, sources, {}, Path("/data"))

        assert "read_csv_auto" in rewritten.lower()
        assert "orders.csv" in rewritten

    def test_same_param_used_twice(self):
        """Same parameter used multiple times creates multiple placeholders."""
        sources = {}
        sql = """
            SELECT * FROM foo
            WHERE category = '${inputs.cat.value}'
            OR subcategory = '${inputs.cat.value}'
        """
        rewritten, params = rewrite_query(sql, sources, {"cat": "Books"})

        assert "$1" in rewritten
        assert "$2" in rewritten
        # Both get the same value
        assert params == ["Books", "Books"]

    def test_null_param_value(self):
        """NULL parameter value is handled."""
        sources = {}
        sql = "SELECT * FROM foo WHERE category = '${inputs.cat.value}'"
        rewritten, params = rewrite_query(sql, sources, {"cat": None})

        assert "$1" in rewritten
        assert params == [None]

    def test_sql_injection_attempt(self):
        """SQL injection attempt is safely parameterized."""
        sources = {}
        sql = "SELECT * FROM foo WHERE name = '${inputs.name.value}'"
        # Attempt SQL injection
        rewritten, params = rewrite_query(sql, sources, {"name": "'; DROP TABLE users; --"})

        # The malicious value should be in params, not in SQL
        assert "DROP TABLE" not in rewritten
        assert "$1" in rewritten
        assert params == ["'; DROP TABLE users; --"]

    def test_invalid_sql_returns_as_is(self):
        """Invalid SQL is returned with params substituted but not parsed."""
        sources = {}
        sql = "THIS IS NOT VALID SQL '${inputs.x.value}'"
        rewritten, params = rewrite_query(sql, sources, {"x": "test"})

        # Params should still be extracted
        assert params == ["test"]
        # SQL returned (possibly modified by param substitution)
        assert "$1" in rewritten

    def test_path_with_special_chars(self):
        """Path with special characters is escaped."""
        sources = {
            "data": DataSource(type="csv", table="data", path="path/with'quote.csv"),
        }
        sql = "SELECT * FROM data"
        rewritten, params = rewrite_query(sql, sources, {}, Path("/base"))

        # Single quote should be escaped
        assert "''" in rewritten or "with'quote" not in rewritten.replace("''", "")

    def test_left_join(self):
        """LEFT JOIN tables are replaced."""
        sources = {
            "orders": DataSource(type="csv", table="orders", path="orders.csv"),
            "customers": DataSource(type="csv", table="customers", path="customers.csv"),
        }
        sql = """
            SELECT o.*, c.name
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
        """
        rewritten, params = rewrite_query(sql, sources, {}, Path("/data"))

        assert rewritten.lower().count("read_csv_auto") == 2

    def test_union(self):
        """Tables in UNION are replaced."""
        sources = {
            "orders_2023": DataSource(type="csv", table="orders_2023", path="2023.csv"),
            "orders_2024": DataSource(type="csv", table="orders_2024", path="2024.csv"),
        }
        sql = """
            SELECT * FROM orders_2023
            UNION ALL
            SELECT * FROM orders_2024
        """
        rewritten, params = rewrite_query(sql, sources, {}, Path("/data"))

        assert "2023.csv" in rewritten
        assert "2024.csv" in rewritten
