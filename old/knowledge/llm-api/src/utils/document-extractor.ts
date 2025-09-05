import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

export interface ExtractedDocument {
  content: string;
  metadata: {
    originalName: string;
    fileType: string;
    size: number;
    extractedAt: string;
    pageCount?: number;
    wordCount?: number;
  };
}

/**
 * Extract text content from PDF files
 */
export async function extractPdfContent(
  buffer: Buffer,
  originalName: string,
): Promise<ExtractedDocument> {
  try {
    const data = await pdfParse(buffer);

    return {
      content: data.text,
      metadata: {
        originalName,
        fileType: 'pdf',
        size: buffer.length,
        extractedAt: new Date().toISOString(),
        pageCount: data.numpages,
        wordCount: data.text.split(/\s+/).length,
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract PDF content: ${error.message}`);
  }
}

/**
 * Extract text content from Word documents (.docx)
 */
export async function extractDocxContent(
  buffer: Buffer,
  originalName: string,
): Promise<ExtractedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer });

    return {
      content: result.value,
      metadata: {
        originalName,
        fileType: 'docx',
        size: buffer.length,
        extractedAt: new Date().toISOString(),
        wordCount: result.value.split(/\s+/).length,
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract DOCX content: ${error.message}`);
  }
}

/**
 * Extract text content from plain text files
 */
export async function extractTextContent(
  buffer: Buffer,
  originalName: string,
): Promise<ExtractedDocument> {
  try {
    const content = buffer.toString('utf-8');

    return {
      content,
      metadata: {
        originalName,
        fileType: 'txt',
        size: buffer.length,
        extractedAt: new Date().toISOString(),
        wordCount: content.split(/\s+/).length,
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract text content: ${error.message}`);
  }
}

/**
 * Extract and format CSV content as text
 */
export async function extractCsvContent(
  buffer: Buffer,
  originalName: string,
): Promise<ExtractedDocument> {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];
    const stream = Readable.from(buffer.toString('utf-8'));

    stream
      .pipe(csvParser())
      .on('data', row => {
        rows.push(row);
      })
      .on('end', () => {
        try {
          // Convert CSV to readable text format
          let content = '';

          if (rows.length > 0) {
            // Add headers
            const headers = Object.keys(rows[0]);
            content += `Headers: ${headers.join(', ')}\n\n`;

            // Add rows in readable format
            rows.forEach((row, index) => {
              content += `Row ${index + 1}:\n`;
              headers.forEach(header => {
                content += `  ${header}: ${row[header] || ''}\n`;
              });
              content += '\n';
            });
          }

          resolve({
            content,
            metadata: {
              originalName,
              fileType: 'csv',
              size: buffer.length,
              extractedAt: new Date().toISOString(),
              wordCount: content.split(/\s+/).length,
            },
          });
        } catch (error) {
          reject(new Error(`Failed to process CSV content: ${error.message}`));
        }
      })
      .on('error', error => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      });
  });
}

/**
 * Extract and format JSON content as text
 */
export async function extractJsonContent(
  buffer: Buffer,
  originalName: string,
): Promise<ExtractedDocument> {
  try {
    const jsonString = buffer.toString('utf-8');
    const jsonData = JSON.parse(jsonString);

    // Convert JSON to readable text format
    const content = JSON.stringify(jsonData, null, 2);

    return {
      content,
      metadata: {
        originalName,
        fileType: 'json',
        size: buffer.length,
        extractedAt: new Date().toISOString(),
        wordCount: content.split(/\s+/).length,
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract JSON content: ${error.message}`);
  }
}

/**
 * Extract markdown content (already text)
 */
export async function extractMarkdownContent(
  buffer: Buffer,
  originalName: string,
): Promise<ExtractedDocument> {
  try {
    const content = buffer.toString('utf-8');

    return {
      content,
      metadata: {
        originalName,
        fileType: 'md',
        size: buffer.length,
        extractedAt: new Date().toISOString(),
        wordCount: content.split(/\s+/).length,
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract markdown content: ${error.message}`);
  }
}

/**
 * Main document extractor that routes to appropriate extraction method
 */
export async function extractDocumentContent(
  buffer: Buffer,
  originalName: string,
  mimeType?: string,
): Promise<ExtractedDocument> {
  if (!originalName) {
    throw new Error('Original filename is required');
  }

  const extension = originalName.toLowerCase().split('.').pop();

  switch (extension) {
    case 'pdf':
      return extractPdfContent(buffer, originalName);
    case 'docx':
      return extractDocxContent(buffer, originalName);
    case 'doc':
      // For .doc files, try docx extractor (may not work for all old .doc files)
      return extractDocxContent(buffer, originalName);
    case 'txt':
      return extractTextContent(buffer, originalName);
    case 'csv':
      return extractCsvContent(buffer, originalName);
    case 'json':
      return extractJsonContent(buffer, originalName);
    case 'md':
      return extractMarkdownContent(buffer, originalName);
    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }
}
