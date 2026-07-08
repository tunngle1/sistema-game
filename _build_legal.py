import zipfile
import xml.etree.ElementTree as ET
import glob
import shutil
import os
import re
import html

ROOT = os.path.dirname(os.path.abspath(__file__))
DL = os.path.join(os.path.expanduser('~'), 'Downloads', 'Telegram Desktop')
LEGAL_DIR = os.path.join(ROOT, 'legal')
DOCS_DIR = os.path.join(LEGAL_DIR, 'documents')
os.makedirs(DOCS_DIR, exist_ok=True)


def extract(path):
    with zipfile.ZipFile(path) as z:
        xml = z.read('word/document.xml')
    root = ET.fromstring(xml)
    texts = []
    for p in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
        parts = [t.text for t in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if t.text]
        if parts:
            texts.append(''.join(parts))
    return texts


def esc(s):
    return html.escape(s)


def linkify(text):
    return re.sub(
        r'(https?://[^\s<]+)',
        r'<a href="\1" target="_blank" rel="noopener">\1</a>',
        esc(text),
    )


def table_from_pairs(rows):
    out = ['<table class="legal__table"><tbody>']
    for a, b in rows:
        out.append(f'<tr><th>{linkify(a)}</th><td>{linkify(b)}</td></tr>')
    out.append('</tbody></table>')
    return '\n'.join(out)


def render_policy(paras):
    parts = []
    parts.append(f'<h1 class="legal__title">{esc(paras[0])}</h1>')
    parts.append(f'<p class="legal__lead">{esc(paras[1])}</p>')

    parts.append('<div class="legal__meta">')
    for line in paras[2:8]:
        if re.match(r'^\d+\.', line):
            break
        parts.append(f'<p>{linkify(line)}</p>')
    parts.append('</div>')

    i = 8
    while i < len(paras):
        line = paras[i]

        if line == '2. Оператор персональных данных':
            parts.append(f'<section class="legal__section"><h2>{esc(line)}</h2>')
            rows = []
            i += 1
            if i < len(paras) and paras[i] == 'Поле':
                i += 2
                while i + 1 < len(paras) and not re.match(r'^\d+\.', paras[i]):
                    rows.append((paras[i], paras[i + 1]))
                    i += 2
            parts.append(table_from_pairs(rows))
            parts.append('</section>')
            continue

        if line == '7. Обработчики и сервисы':
            parts.append(f'<section class="legal__section"><h2>{esc(line)}</h2>')
            rows = []
            i += 1
            if i < len(paras) and paras[i] == 'Сервис / обработчик':
                i += 2
                while i + 1 < len(paras) and not re.match(r'^\d+\.', paras[i]):
                    rows.append((paras[i], paras[i + 1]))
                    i += 2
            parts.append(table_from_pairs(rows))
            if i < len(paras) and re.match(r'^\d+\.\d+\.', paras[i]):
                parts.append(f'<p>{linkify(paras[i])}</p>')
                i += 1
            parts.append('</section>')
            continue

        if re.match(r'^\d+\. [A-ZА-ЯЁ]', line) and not re.match(r'^\d+\.\d+\.', line):
            parts.append(f'<section class="legal__section"><h2>{esc(line)}</h2>')
            i += 1
            ul_open = False
            while i < len(paras):
                nxt = paras[i]
                if re.match(r'^\d+\. [A-ZА-ЯЁ]', nxt) and not re.match(r'^\d+\.\d+\.', nxt):
                    break
                if re.match(r'^\d+\.\d+\.', nxt):
                    if ul_open:
                        parts.append('</ul>')
                        ul_open = False
                    num, rest = nxt.split(' ', 1)
                    parts.append(f'<p><strong>{esc(num)}</strong> {linkify(rest)}</p>')
                elif nxt.endswith(';') or (len(nxt) < 120 and not nxt.endswith('.')):
                    if not ul_open:
                        parts.append('<ul>')
                        ul_open = True
                    parts.append(f'<li>{linkify(nxt.rstrip(";"))}</li>')
                else:
                    if ul_open:
                        parts.append('</ul>')
                        ul_open = False
                    parts.append(f'<p>{linkify(nxt)}</p>')
                i += 1
            if ul_open:
                parts.append('</ul>')
            parts.append('</section>')
            continue

        i += 1

    return '\n'.join(parts)


def render_simple(paras):
    parts = []
    parts.append(f'<h1 class="legal__title">{esc(paras[0])}</h1>')
    parts.append(f'<p class="legal__lead">{esc(paras[1])}</p>')
    parts.append('<div class="legal__meta">')
    for line in paras[2:8]:
        if line.startswith('Я') or line.startswith('Оператор:'):
            break
        parts.append(f'<p>{linkify(line)}</p>')
    parts.append('</div>')
    parts.append('<section class="legal__section">')
    started = False
    for line in paras[2:]:
        if not started:
            if line.startswith('Я'):
                started = True
                parts.append(f'<p>{linkify(line)}</p>')
            continue
        parts.append(f'<p>{linkify(line)}</p>')
    parts.append('</section>')
    return '\n'.join(parts)


TEMPLATE = """<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{page_title} — Игра «Система»</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="icon" href="{asset_prefix}assets/logo.png" type="image/png">
  <link rel="stylesheet" href="{asset_prefix}styles.css">
</head>
<body class="page-legal">
  <header class="header header--scrolled">
    <div class="container header__inner">
      <a href="{home_prefix}index.html" class="logo">
        <img src="{asset_prefix}assets/logo.png" alt="Система" class="logo__img">
      </a>
      <a href="{home_prefix}index.html" class="btn btn--primary">На главную</a>
    </div>
  </header>
  <main class="legal">
    <div class="container legal__inner">
{content}
      <nav class="legal__nav">
        <a href="{nav_privacy}">Политика обработки ПДн</a>
        <a href="{nav_consent_pd}">Согласие на обработку ПДн</a>
        <a href="{nav_consent_mailing}">Согласие на рассылку</a>
      </nav>
      <div class="legal__back">
        <a href="{home_prefix}index.html" class="btn btn--primary">Вернуться на главную</a>
      </div>
    </div>
  </main>
  <footer class="footer">
    <div class="container footer__inner">
      <div class="footer__brand">
        <img src="{asset_prefix}assets/logo.png" alt="Система" class="logo__img logo__img--footer">
      </div>
      <div class="footer__links">
        <a href="{home_prefix}index.html">Главная</a>
        <a href="{nav_privacy}">Политика обработки ПДн</a>
        <a href="{nav_consent_pd}">Согласие на обработку ПДн</a>
        <a href="{nav_consent_mailing}">Согласие на рассылку</a>
      </div>
      <p class="footer__copy">© 2026 ИП Шкарова Светлана Владимировна · Игра «Система»</p>
    </div>
  </footer>
</body>
</html>"""


def write_page(path, page_title, content, ctx):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    html_out = TEMPLATE.format(
        page_title=page_title,
        content=content,
        asset_prefix=ctx['asset'],
        home_prefix=ctx['home'],
        nav_privacy=ctx['nav_privacy'],
        nav_consent_pd=ctx['nav_consent_pd'],
        nav_consent_mailing=ctx['nav_consent_mailing'],
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(html_out)


pages = [
    ('privacy.html', '02_Политика_обработки_персональных_данных.docx', 'policy', 'Политика обработки персональных данных'),
    ('consent-pd.html', '03_Согласие_на_обработку_персональных_данных.docx', 'consent-pd', 'Согласие на обработку персональных данных'),
    ('consent-mailing.html', None, 'consent-mailing', 'Согласие на получение рассылки'),
]

for fname, docx_name, kind, page_title in pages:
    src = os.path.join(DL, docx_name) if docx_name else glob.glob(os.path.join(DL, '04_*.docx'))[0]
    paras = extract(src)
    os.makedirs(os.path.join(ROOT, 'light', 'legal', 'documents'), exist_ok=True)
    shutil.copy2(src, os.path.join(DOCS_DIR, os.path.basename(src)))
    shutil.copy2(src, os.path.join(ROOT, 'light', 'legal', 'documents', os.path.basename(src)))

    content = render_policy(paras) if kind == 'policy' else render_simple(paras)

    root_ctx = {
        'asset': '', 'home': '',
        'nav_privacy': 'privacy.html',
        'nav_consent_pd': 'legal/consent-pd.html',
        'nav_consent_mailing': 'legal/consent-mailing.html',
    }
    sub_ctx = {
        'asset': '../', 'home': '../',
        'nav_privacy': '../privacy.html',
        'nav_consent_pd': 'consent-pd.html',
        'nav_consent_mailing': 'consent-mailing.html',
    }

    if fname == 'privacy.html':
        write_page(os.path.join(ROOT, 'privacy.html'), page_title, content, root_ctx)
        write_page(os.path.join(ROOT, 'light', 'privacy.html'), page_title, content, root_ctx)
    else:
        write_page(os.path.join(ROOT, 'legal', fname), page_title, content, sub_ctx)
        write_page(os.path.join(ROOT, 'light', 'legal', fname), page_title, content, sub_ctx)

print('Done')
