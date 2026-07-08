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
REVISION = 'Редакция от 08.07.2026 г.'
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


def normalize_line(line):
    if line.startswith('Редакция от'):
        return REVISION
    return line.replace('ПУБЛИЧНАЯ ОФЕРТАна', 'ПУБЛИЧНАЯ ОФЕРТА на')


def linkify(text):
    return re.sub(
        r'(https?://[^\s<]+)',
        r'<a href="\1" target="_blank" rel="noopener">\1</a>',
        esc(normalize_line(text)),
    )


def table_from_pairs(rows):
    out = ['<table class="legal__table"><tbody>']
    for a, b in rows:
        out.append(f'<tr><th>{linkify(a)}</th><td>{linkify(b)}</td></tr>')
    out.append('</tbody></table>')
    return '\n'.join(out)


def is_section_header(line):
    return (
        line.startswith('РАЗДЕЛ ')
        or (re.match(r'^\d+\. [A-ZА-ЯЁ«]', line) and not re.match(r'^\d+\.\d+\.', line))
    )


def is_list_item(line):
    if re.match(r'^\d+\.\d+\.', line) or is_section_header(line):
        return False
    if line in ('Состав единой оферты', 'Навигация по документу'):
        return False
    if line.endswith(';'):
        return True
    return len(line) < 120 and not line.endswith('.') and line[:1].islower()


def render_block(paras, start_i, stop_pred, offer_mode=False):
    parts = []
    i = start_i
    ul_open = False
    section_open = False
    toc_mode = False
    seen_toc_razdels = set()

    def close_ul():
        nonlocal ul_open
        if ul_open:
            parts.append('</ul>')
            ul_open = False

    def close_section():
        nonlocal section_open
        if section_open:
            parts.append('</section>')
            section_open = False

    while i < len(paras):
        line = normalize_line(paras[i])
        if stop_pred(line, i):
            break

        if offer_mode and line == 'Состав единой оферты':
            close_ul()
            close_section()
            parts.append(f'<section class="legal__section"><h2>{esc(line)}</h2>')
            section_open = True
            i += 1
            continue

        if offer_mode and line == 'Навигация по документу':
            close_ul()
            parts.append(f'<h2>{esc(line)}</h2><ul class="legal__toc">')
            toc_mode = True
            i += 1
            continue

        if toc_mode and line.startswith('РАЗДЕЛ '):
            if line in seen_toc_razdels:
                parts.append('</ul>')
                toc_mode = False
            else:
                seen_toc_razdels.add(line)
                slug = 'razdel-' + re.sub(r'\D+', '-', line).strip('-').lower()
                parts.append(f'<li><a href="#{slug}">{esc(line)}</a></li>')
                i += 1
                continue

        if toc_mode and line.startswith('РАЗДЕЛ ') is False:
            if line.startswith('РАЗДЕЛ ') or line == '1. Общие положения':
                if toc_mode:
                    parts.append('</ul>')
                    toc_mode = False

        if line == '2. Оператор персональных данных':
            close_ul()
            close_section()
            parts.append(f'<section class="legal__section"><h2>{esc(line)}</h2>')
            section_open = True
            rows = []
            i += 1
            if i < len(paras) and paras[i] == 'Поле':
                i += 2
                while i + 1 < len(paras) and not re.match(r'^\d+\.', paras[i]):
                    rows.append((paras[i], paras[i + 1]))
                    i += 2
            for ri, (a, b) in enumerate(rows):
                if a == 'Страница Политики обработки персональных данных':
                    rows[ri] = (a, 'privacy.html')
            parts.append(table_from_pairs(rows))
            parts.append('</section>')
            section_open = False
            continue

        if line == '7. Обработчики и сервисы':
            close_ul()
            close_section()
            parts.append(f'<section class="legal__section"><h2>{esc(line)}</h2>')
            section_open = True
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
            section_open = False
            continue

        if line.startswith('РАЗДЕЛ '):
            close_ul()
            close_section()
            slug = 'razdel-' + re.sub(r'\D+', '-', line).strip('-').lower()
            parts.append(f'<section class="legal__section" id="{slug}"><h2 class="legal__chapter">{esc(line)}</h2>')
            section_open = True
            i += 1
            continue

        if is_section_header(line):
            close_ul()
            close_section()
            parts.append(f'<section class="legal__section"><h2>{esc(line)}</h2>')
            section_open = True
            i += 1
            continue

        if re.match(r'^\d+\.\d+\.', line):
            close_ul()
            num, rest = line.split(' ', 1)
            parts.append(f'<p><strong>{esc(num)}</strong> {linkify(rest)}</p>')
        elif is_list_item(line):
            if not ul_open:
                parts.append('<ul>')
                ul_open = True
            parts.append(f'<li>{linkify(line.rstrip(";"))}</li>')
        else:
            close_ul()
            parts.append(f'<p>{linkify(line)}</p>')

        i += 1

    close_ul()
    close_section()
    return '\n'.join(parts), i


def render_policy(paras):
    parts = [
        f'<h1 class="legal__title">{esc(normalize_line(paras[0]))}</h1>',
        f'<p class="legal__lead">{esc(normalize_line(paras[1]))}</p>',
        '<div class="legal__meta">',
    ]
    i = 2
    while i < len(paras) and not re.match(r'^1\. ', paras[i]):
        parts.append(f'<p>{linkify(paras[i])}</p>')
        i += 1
    parts.append('</div>')

    body, _ = render_block(paras, i, lambda line, idx: False)
    parts.append(body)
    return '\n'.join(parts)


def render_simple(paras):
    parts = [
        f'<h1 class="legal__title">{esc(normalize_line(paras[0]))}</h1>',
        f'<p class="legal__lead">{esc(normalize_line(paras[1]))}</p>',
        '<div class="legal__meta">',
    ]
    i = 2
    while i < len(paras) and not paras[i].startswith('Я'):
        parts.append(f'<p>{linkify(paras[i])}</p>')
        i += 1
    parts.append('</div>')
    parts.append('<section class="legal__section">')

    while i < len(paras):
        parts.append(f'<p>{linkify(paras[i])}</p>')
        i += 1

    parts.append('</section>')
    return '\n'.join(parts)


def render_offer(paras):
    parts = [
        f'<h1 class="legal__title">{esc(normalize_line(paras[0]))}</h1>',
        f'<p class="legal__lead">{esc(normalize_line(paras[1]))}</p>',
        '<div class="legal__meta">',
    ]

    i = 2
    while i < len(paras) and not paras[i].startswith('Состав единой оферты'):
        parts.append(f'<p>{linkify(paras[i])}</p>')
        i += 1
    parts.append('</div>')

    body, _ = render_block(paras, i, lambda line, idx: False, offer_mode=True)
    parts.append(body)
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
    <div class="container legal__inner legal__inner--wide">
{content}
      <nav class="legal__nav">
        <a href="{nav_privacy}">Политика обработки ПДн</a>
        <a href="{nav_consent_pd}">Согласие на обработку ПДн</a>
        <a href="{nav_consent_mailing}">Согласие на рассылку</a>
        <a href="{nav_offer}">Публичная оферта</a>
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
        <a href="{nav_offer}">Публичная оферта</a>
      </div>
      <p class="footer__copy">© 2026 ИП Шкарова Светлана Владимировна · Игра «Система»</p>
    </div>
  </footer>
</body>
</html>"""


def write_page(path, page_title, content, ctx):
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else '.', exist_ok=True)
    html_out = TEMPLATE.format(
        page_title=page_title,
        content=content,
        asset_prefix=ctx['asset'],
        home_prefix=ctx['home'],
        nav_privacy=ctx['nav_privacy'],
        nav_consent_pd=ctx['nav_consent_pd'],
        nav_consent_mailing=ctx['nav_consent_mailing'],
        nav_offer=ctx['nav_offer'],
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(html_out)


pages = [
    ('privacy.html', '02_Политика_обработки_персональных_данных.docx', 'policy', 'Политика обработки персональных данных'),
    ('consent-pd.html', '03_Согласие_на_обработку_персональных_данных.docx', 'consent-pd', 'Согласие на обработку персональных данных'),
    ('consent-mailing.html', None, 'consent-mailing', 'Согласие на получение рассылки'),
    ('offer.html', 'oferta_sistema_ediny_dokument.docx', 'offer', 'Публичная оферта'),
]

renderers = {
    'policy': render_policy,
    'consent-pd': render_simple,
    'consent-mailing': render_simple,
    'offer': render_offer,
}

root_ctx = {
    'asset': '', 'home': '',
    'nav_privacy': 'privacy.html',
    'nav_consent_pd': 'legal/consent-pd.html',
    'nav_consent_mailing': 'legal/consent-mailing.html',
    'nav_offer': 'legal/offer.html',
}
sub_ctx = {
    'asset': '../', 'home': '../',
    'nav_privacy': '../privacy.html',
    'nav_consent_pd': 'consent-pd.html',
    'nav_consent_mailing': 'consent-mailing.html',
    'nav_offer': 'offer.html',
}

for fname, docx_name, kind, page_title in pages:
    if docx_name:
        src = os.path.join(DL, docx_name)
    else:
        src = glob.glob(os.path.join(DL, '04_*.docx'))[0]

    paras = extract(src)
    os.makedirs(os.path.join(ROOT, 'light', 'legal', 'documents'), exist_ok=True)
    shutil.copy2(src, os.path.join(DOCS_DIR, os.path.basename(src)))
    shutil.copy2(src, os.path.join(ROOT, 'light', 'legal', 'documents', os.path.basename(src)))

    content = renderers[kind](paras)

    if fname == 'privacy.html':
        write_page(os.path.join(ROOT, 'privacy.html'), page_title, content, root_ctx)
        write_page(os.path.join(ROOT, 'light', 'privacy.html'), page_title, content, root_ctx)
    else:
        write_page(os.path.join(ROOT, 'legal', fname), page_title, content, sub_ctx)
        write_page(os.path.join(ROOT, 'light', 'legal', fname), page_title, content, sub_ctx)

print('Done')
