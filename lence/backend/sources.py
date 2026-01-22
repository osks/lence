"""Data sources API routes for Lence."""

import re
from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .database import get_database
from .query_registry import get_registry


router = APIRouter(tags=["sources"])


class QueryRequest(BaseModel):
    """Request body for executing a query (legacy - insecure)."""
    source: str
    sql: str


class SecureQueryRequest(BaseModel):
    """Request body for secure query execution.

    Instead of sending raw SQL, the frontend sends:
    - page: The page path where the query is defined
    - query: The query name (from {% query name="..." %})
    - params: Parameter values for ${inputs.X.value} placeholders
    """
    page: str
    query: str
    params: dict[str, Any] = {}


class ColumnInfo(BaseModel):
    """Column metadata."""
    name: str
    type: str


class QueryResponse(BaseModel):
    """Response from a query execution."""
    columns: list[ColumnInfo]
    data: list[list[Any]]
    row_count: int


class SourceInfo(BaseModel):
    """Information about a data source."""
    name: str
    type: str
    description: str


class ErrorResponse(BaseModel):
    """Error response."""
    error: str
    detail: str | None = None


@router.post("/query", response_model=QueryResponse)
async def execute_query(request: QueryRequest) -> QueryResponse:
    """Execute a SQL query against a registered data source.

    DEPRECATED: This endpoint accepts raw SQL and is insecure.
    Use POST /query/v2 instead which only allows predefined queries.
    """
    db = get_database()

    # Verify source exists
    if request.source not in db.sources:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown source: {request.source}. Available sources: {list(db.sources.keys())}",
        )

    # Security: Only allow SELECT queries
    if not re.match(r'^\s*SELECT\s', request.sql, re.IGNORECASE):
        raise HTTPException(
            status_code=400,
            detail=f"Only SELECT queries are allowed. Got: {request.sql[:100]}",
        )

    try:
        result = db.execute_query(request.sql)
        return QueryResponse(
            columns=[ColumnInfo(**col) for col in result.columns],
            data=result.data,
            row_count=result.row_count,
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Query error: {str(e)}",
        )


@router.post("/query/v2", response_model=QueryResponse)
async def execute_query_secure(request: SecureQueryRequest) -> QueryResponse:
    """Execute a predefined query by name.

    Security model:
    - Only queries defined in markdown pages can be executed
    - Query is looked up by (page, name) in the registry
    - Parameters are validated against expected params
    - SQL is interpolated server-side with proper escaping
    """
    registry = get_registry()
    db = get_database()

    # Look up query in registry
    query = registry.get(request.page, request.query)
    if query is None:
        raise HTTPException(
            status_code=404,
            detail=f"Query not found: '{request.query}' on page '{request.page}'",
        )

    # Validate source exists
    if query.source not in db.sources:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown source: {query.source}",
        )

    # Validate parameters match expected
    expected_params = set(query.params)
    received_params = set(request.params.keys())

    missing = expected_params - received_params
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing parameters: {missing}",
        )

    extra = received_params - expected_params
    if extra:
        raise HTTPException(
            status_code=400,
            detail=f"Unexpected parameters: {extra}",
        )

    # Interpolate parameters into SQL
    sql = registry.interpolate_sql(query, request.params)

    try:
        result = db.execute_query(sql)
        return QueryResponse(
            columns=[ColumnInfo(**col) for col in result.columns],
            data=result.data,
            row_count=result.row_count,
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Query error: {str(e)}",
        )


@router.get("/", response_model=list[SourceInfo])
async def list_sources() -> list[SourceInfo]:
    """List all available data sources."""
    db = get_database()
    sources = db.list_sources()
    return [SourceInfo(**source) for source in sources]


@router.get("/{source_name}", response_model=SourceInfo)
async def get_source(source_name: str) -> SourceInfo:
    """Get information about a specific data source."""
    db = get_database()

    if source_name not in db.sources:
        raise HTTPException(
            status_code=404,
            detail=f"Source not found: {source_name}",
        )

    source = db.sources[source_name]
    return SourceInfo(
        name=source_name,
        type=source.type,
        description=source.description,
    )
