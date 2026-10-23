import re
import html

def format_inline_md(text):
    if not text:
        return ""
    # Escape ampersands not part of entities
    text = re.sub(r'&(?!(?:amp|lt|gt|quot|apos|#\d+);)', '&amp;', text)
    # Convert bold: **text** -> <b>text</b>
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    # Convert italic: *text* -> <i>text</i>
    text = re.sub(r'(?<!\*)\*([^*]+?)\*(?!\*)', r'<i>\1</i>', text)
    # Convert inline code: `code` -> <font name="Courier" color="#0f2b46"><b>code</b></font>
    # Note: escape < and > inside code
    def replace_code(m):
        c = html.escape(m.group(1))
        return f'<font name="Courier" color="#0f2b46"><b>{c}</b></font>'
    text = re.sub(r'`([^`]+)`', replace_code, text)
    # Convert links: [text](url) -> <u>text</u>
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'<u>\1</u>', text)
    return text

s = 'Testing **bold**, *italic*, `someFunc() <Type>`, and [link text](file://path) & raw &'
print('Formatted:', format_inline_md(s))

