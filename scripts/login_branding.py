"""Print the Settings + Assets for the LoginBranding resource in backend/template.yaml.

The sign-in pages use Cognito Managed Login, themed to match the site
(css/style.css colors, the "AS" logo). Cognito's style settings are a large
JSON document, so it is generated here from Cognito's defaults plus the
overrides below, then pasted into the template.

Usage:
  # 1. Get Cognito's current defaults (needs a temporary style; delete it after)
  aws cognito-idp create-managed-login-branding --user-pool-id <pool> --client-id <client> --use-cognito-provided-values
  aws cognito-idp describe-managed-login-branding --user-pool-id <pool> --managed-login-branding-id <id> --return-merged-resources > defaults.json
  aws cognito-idp delete-managed-login-branding --user-pool-id <pool> --managed-login-branding-id <id>
  # 2. Print the YAML block and replace LoginBranding's Settings/Assets with it
  python scripts/login_branding.py defaults.json
"""
import base64
import json
import sys
from pathlib import Path

LOGO = Path(__file__).resolve().parent.parent / "backend" / "branding" / "logo.svg"

# Site palette (frontend/css/style.css), as Cognito RRGGBBAA
L = dict(accent="2563ebff", accentHover="1d4ed8ff", accentActive="1e40afff", accentSoft="eaf1feff",
         bg="f6f7fbff", card="ffffffff", text="16181dff", muted="666a73ff", border="e5e7ebff", input="d1d5dbff",
         placeholder="8a8f98ff", onAccent="ffffffff")
D = dict(accent="6ea8feff", accentHover="93c0ffff", accentActive="6ea8feff", accentSoft="16223aff",
         bg="0f1115ff", card="171a21ff", text="eaebefff", muted="9297a3ff", border="262a33ff", input="363b46ff",
         placeholder="7c818cff", onAccent="0f1115ff")


def primary(c):
    return {"defaults": {"backgroundColor": c["accent"], "textColor": c["onAccent"]},
            "hover": {"backgroundColor": c["accentHover"], "textColor": c["onAccent"]},
            "active": {"backgroundColor": c["accentActive"], "textColor": c["onAccent"]},
            "disabled": {"backgroundColor": c["border"], "borderColor": c["border"]}}


def secondary(c):
    return {"defaults": {"backgroundColor": c["card"], "borderColor": c["input"], "textColor": c["text"]},
            "hover": {"backgroundColor": c["bg"], "borderColor": c["accent"], "textColor": c["accent"]},
            "active": {"backgroundColor": c["accentSoft"], "borderColor": c["accent"], "textColor": c["accent"]}}


def deep_merge(base, over):
    for k, v in over.items():
        if isinstance(v, dict) and isinstance(base.get(k), dict):
            deep_merge(base[k], v)
        else:
            base[k] = v
    return base


def both(fn):
    return {"lightMode": fn(L), "darkMode": fn(D)}


OVERRIDES = {
    "categories": {
        "global": {"colorSchemeMode": "DYNAMIC"},  # follow the visitor's light/dark setting, like the site
        "form": {"displayGraphics": False},
    },
    "components": {
        "primaryButton": both(primary),
        "secondaryButton": both(secondary),
        "idpButton": {"standard": both(secondary)},
        "form": {**both(lambda c: {"backgroundColor": c["card"], "borderColor": c["border"]}),
                 "borderRadius": 14.0,
                 "logo": {"enabled": True, "location": "CENTER", "position": "TOP", "formInclusion": "IN"}},
        "pageBackground": {"image": {"enabled": False}, **both(lambda c: {"color": c["bg"]})},
        "pageText": both(lambda c: {"bodyColor": c["text"], "headingColor": c["text"], "descriptionColor": c["muted"]}),
        "favicon": {"enabledTypes": ["SVG"]},
    },
    "componentClasses": {
        "buttons": {"borderRadius": 10.0},
        "input": {"borderRadius": 10.0, **both(lambda c: {"defaults": {"backgroundColor": c["card"], "borderColor": c["input"]}, "placeholderColor": c["placeholder"]})},
        "dropDown": {"borderRadius": 10.0},
        "focusState": both(lambda c: {"borderColor": c["accent"]}),
        "link": both(lambda c: {"defaults": {"textColor": c["accent"]}, "hover": {"textColor": c["accentHover"]}}),
        "inputLabel": both(lambda c: {"textColor": c["text"]}),
        "inputDescription": both(lambda c: {"textColor": c["muted"]}),
        "divider": both(lambda c: {"borderColor": c["border"]}),
        "optionControls": both(lambda c: {"selected": {"backgroundColor": c["accent"], "foregroundColor": c["onAccent"]}}),
    },
}


def main(defaults_path):
    d = json.load(open(defaults_path, encoding="utf-8"))["ManagedLoginBranding"]
    settings = deep_merge(d["Settings"], OVERRIDES)
    logo = base64.b64encode(LOGO.read_bytes().strip()).decode()
    assets = [{"Category": cat, "ColorMode": mode, "Extension": "SVG", "Bytes": logo}
              for cat in ("FORM_LOGO", "FAVICON_SVG") for mode in ("LIGHT", "DARK")]
    # Keep Cognito's Google icon for the "Continue with Google" button
    assets += [{k: a[k] for k in ("Category", "ColorMode", "Extension", "Bytes", "ResourceId")}
               for a in d["Assets"] if a["Category"] == "IDP_BUTTON_ICON" and a.get("ResourceId") == "Google"]

    ind = " " * 6
    out = [ind + "Settings: " + json.dumps(settings, indent=2).replace("\n", "\n" + ind + "  "), ind + "Assets:"]
    for a in assets:
        out.append(ind + "  - " + "\n".join(
            (ind + "    " if i else "") + f"{k}: {v}" for i, (k, v) in enumerate(a.items())))
    print("\n".join(out))


if __name__ == "__main__":
    main(sys.argv[1])
