"""Tests for config module."""

import tempfile
from pathlib import Path

from lence.backend.config import QUERY_FILE_PATTERN, load_queries


class TestQueryFilePattern:
    """Tests for query file naming pattern."""

    def test_valid_simple_name(self):
        assert QUERY_FILE_PATTERN.match("monthly_sales.sql")

    def test_valid_with_numbers(self):
        assert QUERY_FILE_PATTERN.match("top_10_products.sql")

    def test_valid_single_letter(self):
        assert QUERY_FILE_PATTERN.match("a.sql")

    def test_invalid_starts_with_number(self):
        assert not QUERY_FILE_PATTERN.match("123_report.sql")

    def test_invalid_starts_with_underscore(self):
        assert not QUERY_FILE_PATTERN.match("_draft.sql")

    def test_invalid_has_hyphen(self):
        assert not QUERY_FILE_PATTERN.match("top-products.sql")

    def test_invalid_has_uppercase(self):
        assert not QUERY_FILE_PATTERN.match("Monthly_Sales.sql")

    def test_invalid_has_space(self):
        assert not QUERY_FILE_PATTERN.match("my report.sql")


class TestLoadQueries:
    """Tests for load_queries function."""

    def test_loads_valid_sql_files(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)

            # Create sources.yaml
            (project_dir / "sources.yaml").write_text("queries: queries/\n")

            # Create queries directory with SQL files
            queries_dir = project_dir / "queries"
            queries_dir.mkdir()
            (queries_dir / "monthly_sales.sql").write_text("SELECT month FROM orders")
            (queries_dir / "top_products.sql").write_text("SELECT name FROM products")

            queries = load_queries(project_dir)

            assert len(queries) == 2
            assert "monthly_sales" in queries
            assert "top_products" in queries
            assert queries["monthly_sales"] == "SELECT month FROM orders"

    def test_ignores_invalid_filenames(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)

            (project_dir / "sources.yaml").write_text("queries: queries/\n")

            queries_dir = project_dir / "queries"
            queries_dir.mkdir()
            (queries_dir / "valid_query.sql").write_text("SELECT 1")
            (queries_dir / "_draft.sql").write_text("SELECT 2")
            (queries_dir / "Invalid-Name.sql").write_text("SELECT 3")

            queries = load_queries(project_dir)

            assert len(queries) == 1
            assert "valid_query" in queries

    def test_returns_empty_when_no_queries_config(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)

            (project_dir / "sources.yaml").write_text("sources: []\n")

            queries = load_queries(project_dir)

            assert queries == {}

    def test_returns_empty_when_queries_dir_missing(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)

            (project_dir / "sources.yaml").write_text("queries: nonexistent/\n")

            queries = load_queries(project_dir)

            assert queries == {}

    def test_loads_from_subdirectories(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)

            (project_dir / "sources.yaml").write_text("queries: queries/\n")

            queries_dir = project_dir / "queries"
            queries_dir.mkdir()
            (queries_dir / "top_level.sql").write_text("SELECT 1")

            subdir = queries_dir / "reports"
            subdir.mkdir()
            (subdir / "monthly.sql").write_text("SELECT 2")

            deep_subdir = subdir / "sales"
            deep_subdir.mkdir()
            (deep_subdir / "by_region.sql").write_text("SELECT 3")

            queries = load_queries(project_dir)

            assert len(queries) == 3
            assert "top_level" in queries
            assert "reports/monthly" in queries
            assert "reports/sales/by_region" in queries

    def test_same_filename_different_dirs_no_conflict(self):
        """Same filename in different directories creates unique query names."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = Path(tmpdir)

            (project_dir / "sources.yaml").write_text("queries: queries/\n")

            queries_dir = project_dir / "queries"
            queries_dir.mkdir()
            (queries_dir / "sales.sql").write_text("SELECT 1")

            subdir = queries_dir / "reports"
            subdir.mkdir()
            (subdir / "sales.sql").write_text("SELECT 2")

            queries = load_queries(project_dir)

            # Both should be loaded with different names
            assert len(queries) == 2
            assert "sales" in queries
            assert "reports/sales" in queries
