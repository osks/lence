"""Query API routes for Lence."""

from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from lence.database import get_database


router = APIRouter(tags=["query"])


class QueryRequest(BaseModel):
    """Request body for executing a query."""
    source: str
    sql: str


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
    """Execute a SQL query against a registered data source."""
    db = get_database()

    # Verify source exists
    if request.source not in db.sources:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown source: {request.source}. Available sources: {list(db.sources.keys())}",
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


@router.get("/sources", response_model=list[SourceInfo])
async def list_sources() -> list[SourceInfo]:
    """List all available data sources."""
    db = get_database()
    sources = db.list_sources()
    return [SourceInfo(**source) for source in sources]


@router.get("/sources/{source_name}", response_model=SourceInfo)
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
