import io
import re
from pypdf import PdfReader

def extract_text_from_pdf(buffer: bytes) -> str:
    pdf_file = io.BytesIO(buffer)
    reader = PdfReader(pdf_file)
    text_parts = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_parts.append(page_text)
    return "\n".join(text_parts)

def extract_text_from_plain(buffer: bytes) -> str:
    try:
        return buffer.decode('utf-8')
    except UnicodeDecodeError:
        try:
            return buffer.decode('latin-1')
        except Exception:
            raise Exception("Could not decode plain text resume file.")

def parse_resume(file_bytes: bytes, mimetype: str) -> str:
    text = ""
    if mimetype == "application/pdf":
        text = extract_text_from_pdf(file_bytes)
    else:
        text = extract_text_from_plain(file_bytes)

    # Clean up whitespace
    text = text.replace("\r\n", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = text.strip()

    if not text or len(text) < 50:
        raise Exception("Could not extract readable text from resume (extracted text too short).")

    return text
