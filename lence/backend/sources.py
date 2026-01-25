"""Data sources API routes for Lence."""

from typing import Any
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from .database import get_database
from .query_registry import get_registry, QueryDefinition, extract_params


router = APIRouter(tags=["sources"])


class QueryRequest(BaseModel):
    """Request body for query execution.

    - Normal mode: Uses page + query to lookup in registry
    - Edit mode: Uses provided sql, skips registry
    """
    page: str
    query: str
    params: dict[str, Any] = {}
    # Used in edit mode (when query isn't in registry yet)
    sql: str | None = None


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
    table: str
    type: str


class ErrorResponse(BaseModel):
    """Error response."""
    error: str
    detail: str | None = None


@router.post("/query", response_model=QueryResponse)
async def execute_query(request: QueryRequest, req: Request) -> QueryResponse:
    """Execute a query.

    In normal mode:
    - Query is looked up by (page, query) in the registry
    - Parameters are validated against expected params
    - SQL is interpolated server-side with proper escaping

    In edit mode (--edit flag):
    - Uses provided sql from request
    - Allows authoring new pages with live query preview
    """
    registry = get_registry()
    edit_mode = getattr(req.app.state, "edit_mode", False)

    # Determine query definition: from registry or from request
    # In edit mode with sql provided, use it directly
    # Otherwise, always use registry lookup
    if edit_mode and request.sql is not None:
        query = QueryDefinition(
            name=request.query,
            sql=request.sql,
            params=extract_params(request.sql),
        )
    else:
        # Lookup in registry
        query = registry.get(request.page, request.query)
        if query is None:
            raise HTTPException(
                status_code=404,
                detail=f"Query not found: '{request.query}' on page '{request.page}'",
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

    db = get_database()
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


@router.get("/{table_name}", response_model=SourceInfo)
async def get_source(table_name: str) -> SourceInfo:
    """Get information about a specific data source by table name."""
    db = get_database()

    if table_name not in db.sources:
        raise HTTPException(
            status_code=404,
            detail=f"Table not found: {table_name}",
        )

    source = db.sources[table_name]
    return SourceInfo(
        table=table_name,
        type=source.type,
    )
