import secrets
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models import VerificationCode

def generate_code() -> str:
    """生成 6 位随机数字验证码"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])

async def create_verification_code(
    db: AsyncSession,
    email: str,
    purpose: str
) -> str:
    """生成验证码并存入数据库"""
    code = generate_code()
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    # 删除该邮箱和用途的旧验证码
    await db.execute(
        select(VerificationCode).filter(
            VerificationCode.email == email,
            VerificationCode.purpose == purpose
        )
    )
    old_codes = (await db.execute(
        select(VerificationCode).filter(
            VerificationCode.email == email,
            VerificationCode.purpose == purpose
        )
    )).scalars().all()

    for old_code in old_codes:
        await db.delete(old_code)

    # 创建新验证码
    verification_code = VerificationCode(
        email=email,
        code=code,
        purpose=purpose,
        expires_at=expires_at
    )
    db.add(verification_code)
    await db.commit()

    return code

async def verify_code_valid(
    db: AsyncSession,
    email: str,
    code: str,
    purpose: str
) -> bool:
    """验证码校验（5分钟有效期）"""
    result = await db.execute(
        select(VerificationCode).filter(
            VerificationCode.email == email,
            VerificationCode.code == code,
            VerificationCode.purpose == purpose,
            VerificationCode.expires_at > datetime.utcnow()
        )
    )
    verification_code = result.scalar_one_or_none()

    if verification_code:
        # 验证通过后删除验证码
        await db.delete(verification_code)
        await db.commit()
        return True

    return False
