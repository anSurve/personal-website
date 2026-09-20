import hashlib
import hmac
import os


def check_password(password):
    expected = os.environ.get("UPLOAD_PASSWORD_HASH", "")
    if not expected or not password:
        return False
    actual = hashlib.sha256(password.encode()).hexdigest()
    return hmac.compare_digest(actual, expected)
