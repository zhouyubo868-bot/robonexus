"""
Authentication routes for RoboNexus API
Implements: signup, login, verify-code, resend-code, forgot-password, refresh
"""
import random
import secrets
from datetime import datetime, timedelta
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token
)
from config import settings
from database import get_db
from models import User, VerificationCode, RefreshToken
from schemas import (
    UserCreate,
    UserLogin,
    VerifyCodeRequest,
    ResendCodeRequest,
    ForgotPasswordRequest,
    RefreshTokenRequest,
    SignupResponse,
    SignupResponseData,
    LoginResponse,
    LoginResponseData,
    TokenResponse,
    TokenData,
    UserData,
    SuccessResponse,
    ErrorResponse,
    ErrorDetail
)

router = APIRouter()


def generate_verification_code() -> str:
    """Generate a 6-digit verification code"""
    return str(random.randint(100000, 999999))


def generate_pending_token() -> str:
    """Generate a secure pending token"""
    return f"pending_{secrets.token_urlsafe(32)}"


async def save_verification_code(
    db: AsyncSession,
    email: str,
    code: str,
    purpose: str,
    expires_minutes: int = 10
) -> None:
    """Save verification code to database"""
    # Delete old codes for this email and purpose
    result = await db.execute(
        select(VerificationCode).filter(
            and_(
                VerificationCode.email == email,
                VerificationCode.purpose == purpose
            )
        )
    )
    old_codes = result.scalars().all()
    for old_code in old_codes:
        await db.delete(old_code)

    # Create new verification code
    verification_code = VerificationCode(
        email=email,
        code=code,
        purpose=purpose,
        expires_at=datetime.utcnow() + timedelta(minutes=expires_minutes)
    )
    db.add(verification_code)
    await db.commit()


async def verify_code(db: AsyncSession, email: str, code: str, purpose: str) -> bool:
    """Verify a verification code"""
    result = await db.execute(
        select(VerificationCode).filter(
            and_(
                VerificationCode.email == email,
                VerificationCode.code == code,
                VerificationCode.purpose == purpose,
                VerificationCode.expires_at > datetime.utcnow()
            )
        )
    )
    verification_code = result.scalar_one_or_none()

    if verification_code:
        # Delete used code
        await db.delete(verification_code)
        await db.commit()
        return True
    return False


def user_to_dict(user: User) -> UserData:
    """Convert User model to UserData schema"""
    return UserData(
        id=f"usr_{user.id}",
        name=user.name,
        email=user.email,
        createdAt=user.created_at
    )


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    User registration endpoint
    Creates a new user and returns requiresEmailVerification: true with pendingToken
    """
    # Check if email already exists
    result = await db.execute(
        select(User).filter(User.email == user_data.email)
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": {
                    "code": "EMAIL_EXISTS",
                    "message": "该邮箱已被注册"
                }
            }
        )

    # Create new user
    hashed_pwd = hash_password(user_data.password)
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        hashed_password=hashed_pwd,
        is_verified=False
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Generate verification code
    code = generate_verification_code()
    await save_verification_code(db, user_data.email, code, "email")

    # Generate pending token
    pending_token = generate_pending_token()

    # TODO: Send verification email with code
    # For development, print the code
    print(f"[DEV] Verification code for {user_data.email}: {code}")

    return SignupResponse(
        success=True,
        data=SignupResponseData(
            requiresEmailVerification=True,
            pendingToken=pending_token,
            email=user_data.email,
            userId=f"usr_{new_user.id}"
        )
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    User login endpoint
    Validates email and password, checks for 2FA
    Returns requiresTwoFactor: true if 2FA enabled, otherwise returns tokens
    """
    # Find user by email
    result = await db.execute(
        select(User).filter(User.email == credentials.email)
    )
    user = result.scalar_one_or_none()

    # Verify credentials
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "error": {
                    "code": "INVALID_CREDENTIALS",
                    "message": "邮箱或密码错误"
                }
            }
        )

    # Check if user is verified
    if not user.is_verified:
        # Generate verification code
        code = generate_verification_code()
        await save_verification_code(db, credentials.email, code, "email")
        pending_token = generate_pending_token()

        print(f"[DEV] Verification code for {credentials.email}: {code}")

        return LoginResponse(
            success=True,
            data=LoginResponseData(
                requiresEmailVerification=True,
                pendingToken=pending_token,
                email=credentials.email
            )
        )

    # Check if 2FA is enabled (demo logic: email contains "2fa")
    has_2fa = "2fa" in credentials.email.lower()

    if has_2fa:
        # Generate 2FA code
        code = generate_verification_code()
        await save_verification_code(db, credentials.email, code, "2fa")
        pending_token = generate_pending_token()

        print(f"[DEV] 2FA code for {credentials.email}: {code}")

        return LoginResponse(
            success=True,
            data=LoginResponseData(
                requiresTwoFactor=True,
                pendingToken=pending_token,
                email=credentials.email
            )
        )

    # Generate tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    # Save refresh token to database
    refresh_token_obj = RefreshToken(
        token=refresh_token,
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(refresh_token_obj)
    await db.commit()

    return LoginResponse(
        success=True,
        data=LoginResponseData(
            token=access_token,
            refreshToken=refresh_token,
            user=user_to_dict(user)
        )
    )


@router.post("/verify-code", response_model=TokenResponse)
async def verify_code_endpoint(
    verify_request: VerifyCodeRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify email verification code or 2FA code
    Returns access_token and refresh_token upon successful verification
    """
    # Verify the code
    is_valid = await verify_code(
        db,
        verify_request.email,
        verify_request.code,
        verify_request.purpose.value
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": {
                    "code": "INVALID_CODE",
                    "message": "验证码错误或已过期"
                }
            }
        )

    # Find user
    result = await db.execute(
        select(User).filter(User.email == verify_request.email)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "error": {
                    "code": "USER_NOT_FOUND",
                    "message": "用户不存在"
                }
            }
        )

    # If email verification, mark user as verified
    if verify_request.purpose.value == "email":
        user.is_verified = True
        await db.commit()
        await db.refresh(user)

    # Generate tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    # Save refresh token to database
    refresh_token_obj = RefreshToken(
        token=refresh_token,
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(refresh_token_obj)
    await db.commit()

    return TokenResponse(
        success=True,
        data=TokenData(
            token=access_token,
            refreshToken=refresh_token,
            user=user_to_dict(user)
        )
    )


@router.post("/resend-code", response_model=SuccessResponse)
async def resend_code(
    resend_request: ResendCodeRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Resend verification code
    Generates a new code and sends it to the user's email
    """
    # Check if user exists
    result = await db.execute(
        select(User).filter(User.email == resend_request.email)
    )
    user = result.scalar_one_or_none()

    if not user:
        # For security reasons, always return success even if email doesn't exist
        return SuccessResponse(
            success=True,
            message="验证码已重新发送"
        )

    # Generate new verification code
    code = generate_verification_code()
    await save_verification_code(db, resend_request.email, code, resend_request.purpose.value)

    # TODO: Send verification email with code
    print(f"[DEV] Resent verification code for {resend_request.email}: {code}")

    return SuccessResponse(
        success=True,
        message="验证码已重新发送"
    )


@router.post("/forgot-password", response_model=SuccessResponse)
async def forgot_password(
    forgot_request: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Forgot password endpoint
    Sends password reset link to user's email
    Always returns same response for security (doesn't reveal if email exists)
    """
    # Check if user exists
    result = await db.execute(
        select(User).filter(User.email == forgot_request.email)
    )
    user = result.scalar_one_or_none()

    if user:
        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        # TODO: Save reset token to database with expiration
        # TODO: Send password reset email with reset_token
        print(f"[DEV] Password reset token for {forgot_request.email}: {reset_token}")

    # Always return same response for security
    return SuccessResponse(
        success=True,
        message="如果该邮箱已注册,重置链接已发送"
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token_endpoint(
    refresh_request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh access token using refresh token
    Returns new access_token and optionally new refresh_token
    """
    try:
        # Decode refresh token
        payload = decode_token(refresh_request.refreshToken)
        user_id = payload.get("sub")
        token_type = payload.get("type")

        if not user_id or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "success": False,
                    "error": {
                        "code": "INVALID_TOKEN",
                        "message": "无效的刷新令牌"
                    }
                }
            )

        # Check if refresh token exists in database and is not expired
        result = await db.execute(
            select(RefreshToken).filter(
                and_(
                    RefreshToken.token == refresh_request.refreshToken,
                    RefreshToken.expires_at > datetime.utcnow()
                )
            )
        )
        refresh_token_obj = result.scalar_one_or_none()

        if not refresh_token_obj:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "success": False,
                    "error": {
                        "code": "TOKEN_EXPIRED",
                        "message": "刷新令牌已过期"
                    }
                }
            )

        # Get user
        result = await db.execute(
            select(User).filter(User.id == int(user_id))
        )
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "success": False,
                    "error": {
                        "code": "USER_NOT_FOUND",
                        "message": "用户不存在"
                    }
                }
            )

        # Generate new access token
        new_access_token = create_access_token(data={"sub": str(user.id)})

        # Optionally rotate refresh token
        new_refresh_token = create_refresh_token(data={"sub": str(user.id)})

        # Delete old refresh token
        await db.delete(refresh_token_obj)

        # Save new refresh token
        new_refresh_token_obj = RefreshToken(
            token=new_refresh_token,
            user_id=user.id,
            expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        )
        db.add(new_refresh_token_obj)
        await db.commit()

        return TokenResponse(
            success=True,
            data=TokenData(
                token=new_access_token,
                refreshToken=new_refresh_token,
                user=user_to_dict(user)
            )
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "无效的刷新令牌"
                }
            }
        )
