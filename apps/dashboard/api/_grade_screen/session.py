"""Site lock for the Python functions: same session cookie as src/lib/session.ts (HMAC-SHA256, key derived from
AUTH_PASSWORD). Production with no AUTH_PASSWORD fails closed; locally (no VERCEL_ENV) the lock is off."""
import base64, hashlib, hmac, time
from http.cookies import SimpleCookie

USER, COOKIE = "karimhossien", "cr_session"


def _key(password):
    return hashlib.sha256(f"card-radar-session-v1:{password}".encode()).digest()


def sign(password, now=None):
    body = f"{USER}.{int(now if now is not None else time.time()) + 30 * 24 * 3600}"
    sig = base64.urlsafe_b64encode(hmac.new(_key(password), body.encode(), hashlib.sha256).digest()).rstrip(b"=").decode()
    return f"{body}.{sig}"


def verify(token, password, now=None):
    if not token or not password:
        return False
    parts = token.split(".")
    if len(parts) != 3 or parts[0] != USER or not parts[1].isdigit() or int(parts[1]) < (now if now is not None else time.time()):
        return False
    want = base64.urlsafe_b64encode(hmac.new(_key(password), f"{parts[0]}.{parts[1]}".encode(), hashlib.sha256).digest()).rstrip(b"=").decode()
    return hmac.compare_digest(want, parts[2])


def logged_in(headers, env):
    password = env.get("AUTH_PASSWORD")
    if not password:
        return not env.get("VERCEL_ENV")  # deployed without a password: locked; local tests: open
    jar = SimpleCookie()
    try:
        jar.load(headers.get("cookie") or "")
    except Exception:
        return False
    return verify(jar[COOKIE].value if COOKIE in jar else None, password)
