const pdfParse = require('pdf-parse');

async function extractTextFromPDF(buffer) {
    const data = await pdfParse(buffer);
    return data.text;
}

function extractTextFromPlain(buffer) {
    return buffer.toString('utf-8');
}

async function parseResume(file) {
    let text = '';

    if (file.mimetype === 'application/pdf') {
        text = await extractTextFromPDF(file.buffer);
    } else {
        text = extractTextFromPlain(file.buffer);
    }

    // Clean up whitespace
    text = text
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();

    if (!text || text.length < 50) {
        throw new Error('Could not extract readable text from resume');
    }

    return text;
}

module.exports = { parseResume };