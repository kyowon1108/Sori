from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.elderly import ElderlyCreateRequest, ElderlyUpdateRequest, ElderlyResponse
from app.schemas.response import success_response
from app.services.elderly import ElderlyService

router = APIRouter()


@router.get("")
async def list_elderly(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """현재 사용자의 어르신 목록 조회"""
    elderly_list = ElderlyService.get_list(db, current_user.id, skip, limit)
    total = len(elderly_list)
    return success_response(
        data={
            "items": [ElderlyResponse.model_validate(e).model_dump() for e in elderly_list],
            "total": total
        },
        message="OK",
        code=200
    )


@router.get("/{elderly_id}")
async def get_elderly(
    elderly_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """어르신 상세 조회"""
    elderly = ElderlyService.get_by_id(db, elderly_id, current_user.id)
    return success_response(
        data=ElderlyResponse.model_validate(elderly).model_dump(),
        message="OK",
        code=200
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_elderly(
    elderly_data: ElderlyCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """새 어르신 등록"""
    elderly = ElderlyService.create(db, elderly_data, current_user.id)
    return success_response(
        data=ElderlyResponse.model_validate(elderly).model_dump(),
        message="Elderly registered",
        code=201
    )


@router.put("/{elderly_id}")
async def update_elderly(
    elderly_id: int,
    elderly_data: ElderlyUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """어르신 정보 수정"""
    elderly = ElderlyService.update(db, elderly_id, current_user.id, elderly_data)
    return success_response(
        data=ElderlyResponse.model_validate(elderly).model_dump(),
        message="Elderly updated",
        code=200
    )


@router.delete("/{elderly_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_elderly(
    elderly_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """어르신 삭제"""
    ElderlyService.delete(db, elderly_id, current_user.id)
    return None
