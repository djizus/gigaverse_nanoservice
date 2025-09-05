import { Injectable } from '@nestjs/common';
import { marked } from 'marked';
import { DocumentParser, ParseResult } from './parser.interface';
import { DocumentChunk, DocumentMetadata } from '../entities/document.entity';

@Injectable()
export class MarkdownParser implements DocumentParser {
  async parse(content: string, documentId: string): Promise<ParseResult> {
    const metadata: DocumentMetadata = {};
    const chunks: DocumentChunk[] = [];

    // Extract front matter if present
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontMatterMatch) {
      const frontMatter = frontMatterMatch[1];
      content = content.replace(frontMatterMatch[0], '').trim();

      // Parse YAML-like front matter
      frontMatter.split('\n').forEach(line => {
        const [key, value] = line.split(':').map(s => s.trim());
        if (key && value) {
          if (key === 'tags') {
            metadata.tags = value.split(',').map(s => s.trim());
          } else {
            metadata[key] = value;
          }
        }
      });
    }

    // Extract title from first heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch && !metadata.title) {
      metadata.title = titleMatch[1];
    }

    // Parse markdown to HTML then to text
    const html = await marked.parse(content);
    const text = html.replace(/<[^>]*>/g, '');

    // Split into sections based on headings
    const sections = content.split(/^#{1,3}\s+/m);
    let currentLine = 0;

    sections.forEach((section, index) => {
      if (!section.trim()) return;

      const sectionLines = section.split('\n');
      const sectionTitle = index > 0 ? sectionLines[0] : 'Introduction';
      const sectionContent =
        index > 0 ? sectionLines.slice(1).join('\n') : section;

      // Split section into paragraphs
      const paragraphs = sectionContent.split(/\n{2,}/);

      paragraphs.forEach((paragraph, pIndex) => {
        if (!paragraph.trim()) return;

        chunks.push({
          id: `${documentId}-chunk-${chunks.length}`,
          documentId,
          content: paragraph.trim(),
          metadata: {
            section: sectionTitle,
            paragraph: pIndex,
            startLine: currentLine,
            endLine: currentLine + paragraph.split('\n').length - 1,
          },
        });

        currentLine += paragraph.split('\n').length + 2;
      });
    });

    return {
      content: text,
      metadata,
      chunks,
    };
  }

  canParse(fileType: string): boolean {
    return ['markdown', 'md'].includes(fileType.toLowerCase());
  }

  getSupportedTypes(): string[] {
    return ['markdown', 'md'];
  }
}
