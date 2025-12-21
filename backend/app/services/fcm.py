"""
Firebase Cloud Messaging service for push notifications.
"""
import logging
from typing import Optional, List, Dict, Any

from app.core.config import settings

logger = logging.getLogger(__name__)

# Firebase Admin SDK initialization
_firebase_app = None


def _init_firebase():
    """Initialize Firebase Admin SDK if credentials are available."""
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    if not settings.FIREBASE_CREDENTIALS_PATH:
        logger.warning("FIREBASE_CREDENTIALS_PATH not set. FCM will be disabled.")
        return None

    try:
        import firebase_admin
        from firebase_admin import credentials

        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        _firebase_app = firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialized successfully")
        return _firebase_app
    except FileNotFoundError:
        logger.error(f"Firebase credentials file not found: {settings.FIREBASE_CREDENTIALS_PATH}")
        return None
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {e}")
        return None


class FCMService:
    """Service for sending push notifications via Firebase Cloud Messaging."""

    def __init__(self):
        self._app = _init_firebase()

    @property
    def is_available(self) -> bool:
        """Check if FCM is properly configured and available."""
        return self._app is not None

    def send_to_token(
        self,
        token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
    ) -> Optional[str]:
        """
        Send a push notification to a specific device token.

        Args:
            token: FCM device token
            title: Notification title
            body: Notification body
            data: Optional data payload (all values must be strings)

        Returns:
            Message ID if successful, None if failed
        """
        if not self.is_available:
            logger.warning("FCM not available. Skipping notification.")
            return None

        try:
            from firebase_admin import messaging

            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data=data or {},
                token=token,
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(
                            sound="default",
                            badge=1,
                        )
                    )
                ),
            )

            response = messaging.send(message)
            logger.info(f"Successfully sent message: {response}")
            return response

        except Exception as e:
            # firebase-admin 버전/환경에 따라 예외 타입이 다를 수 있음
            error_str = str(e)

            # 먼저 FirebaseError code 기반 처리 시도
            code = getattr(e, "code", None)
            if code in ("UNREGISTERED", "SENDER_ID_MISMATCH", "registration-token-not-registered"):
                logger.warning(f"Invalid FCM token (code={code}): {token[:20]}...")
                self._handle_invalid_token(token)
                return None

            # 문자열 기반 fallback 처리
            if "Requested entity was not found" in error_str or "registration-token-not-registered" in error_str:
                logger.warning(f"Invalid FCM token: {token[:20]}...")
                self._handle_invalid_token(token)
            else:
                logger.error(f"Failed to send FCM message: {e}")
            return None

    def send_to_tokens(
        self,
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Send a push notification to multiple device tokens.

        Returns:
            Dict with success_count, failure_count, and failed_tokens
        """
        if not self.is_available:
            logger.warning("FCM not available. Skipping multicast notification.")
            return {"success_count": 0, "failure_count": len(tokens), "failed_tokens": tokens}

        if not tokens:
            return {"success_count": 0, "failure_count": 0, "failed_tokens": []}

        try:
            from firebase_admin import messaging

            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data=data or {},
                tokens=tokens,
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(
                            sound="default",
                            badge=1,
                        )
                    )
                ),
            )

            response = messaging.send_each_for_multicast(message)

            failed_tokens = []
            for idx, send_response in enumerate(response.responses):
                if not send_response.success:
                    failed_tokens.append(tokens[idx])
                    error = send_response.exception
                    if error and ("not found" in str(error).lower() or "not-registered" in str(error).lower()):
                        self._handle_invalid_token(tokens[idx])

            logger.info(f"Multicast result: {response.success_count} success, {response.failure_count} failed")
            return {
                "success_count": response.success_count,
                "failure_count": response.failure_count,
                "failed_tokens": failed_tokens,
            }

        except Exception as e:
            logger.error(f"Failed to send multicast FCM message: {e}")
            return {"success_count": 0, "failure_count": len(tokens), "failed_tokens": tokens}

    def _handle_invalid_token(self, token: str):
        """Mark an invalid token as inactive in the database."""
        try:
            from app.database import SessionLocal
            from app.models.elderly_device import ElderlyDevice

            db = SessionLocal()
            try:
                device = db.query(ElderlyDevice).filter(
                    ElderlyDevice.fcm_token == token
                ).first()
                if device:
                    device.is_active = False
                    db.commit()
                    logger.info(f"Deactivated invalid FCM token for device {device.id}")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Failed to deactivate invalid token: {e}")


# Singleton instance
fcm_service = FCMService()
