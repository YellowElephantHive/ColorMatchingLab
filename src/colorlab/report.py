"""Package data and portable inference into one self-contained local HTML file."""
import json
from pathlib import Path


def render_html(run_dir):
    root = Path(__file__).parent / "web"
    report = json.loads((Path(run_dir) / "report.json").read_text())
    payload = json.dumps(report, ensure_ascii=False, allow_nan=False, separators=(",", ":")).replace("<", "\\u003c")
    html = (root / "index.html").read_text()
    html = html.replace("/* COLORLAB_STYLE */", (root / "style.css").read_text())
    html = html.replace("/* COLORLAB_ENGINE */", (root / "engine.js").read_text())
    html = html.replace("/* COLORLAB_I18N */", (root / "i18n.js").read_text())
    html = html.replace("/* COLORLAB_APP */", (root / "app.js").read_text())
    html = html.replace("__COLORLAB_DATA__", payload)
    return html


def export_html(run_dir, destination):
    html = render_html(run_dir)
    path = Path(destination)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(html)
    return path
