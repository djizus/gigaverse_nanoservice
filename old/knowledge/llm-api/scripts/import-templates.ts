import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_API_KEY = process.env.SUPABASE_API_KEY || '';

if (!SUPABASE_URL || !SUPABASE_API_KEY) {
  console.error(
    'Please set SUPABASE_URL and SUPABASE_API_KEY environment variables',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_API_KEY);

// Template parser
function parseTemplateFile(filePath: string): any {
  const content = readFileSync(filePath, 'utf-8');

  // Extract template information using regex
  const titleMatch = content.match(/^# Context: (.+)$/m);
  const descriptionMatch = content.match(/## Description\n(.+?)(?=\n##)/s);
  const instructionsMatch = content.match(
    /## Agent Instructions\n```\n([\s\S]+?)\n```/,
  );
  const usageExampleMatch = content.match(/const \w+Agent = ({[\s\S]+?});/);

  if (!titleMatch || !descriptionMatch) {
    console.warn(`Could not parse template from ${filePath}`);
    return null;
  }

  // Parse the usage example to extract context and default args
  let contexts = ['chat']; // default
  let contextArgs: any = {};

  if (usageExampleMatch) {
    try {
      // Extract contexts array
      const contextsMatch = usageExampleMatch[1].match(
        /contexts:\s*\[([^\]]+)\]/,
      );
      if (contextsMatch) {
        contexts = contextsMatch[1]
          .split(',')
          .map(c => c.trim().replace(/['"]/g, ''));
      }

      // Extract context_args
      const contextArgsMatch = usageExampleMatch[1].match(
        /context_args:\s*{([^}]+)}/,
      );
      if (contextArgsMatch) {
        // Simple parsing of context args
        const contextName = contexts[0];
        contextArgs[contextName] = {
          sessionId: `${contextName}-session-${Date.now()}`,
          userId: 'user',
        };
      }
    } catch (e) {
      console.warn('Could not parse usage example:', e);
    }
  }

  // Extract file base name for ID
  const fileName = filePath.split('/').pop()?.replace('.md', '') || '';
  const id = fileName.replace(/^\d+-/, ''); // Remove number prefix

  return {
    id,
    name: titleMatch[1],
    description: descriptionMatch[1].trim(),
    model_type: 'anthropic',
    model_id: 'claude-3-5-sonnet-latest',
    instructions: instructionsMatch ? instructionsMatch[1].trim() : '',
    contexts,
    context_args: contextArgs,
    capabilities: {
      mcp_enabled: true,
      streaming: true,
      file_access: false,
      web_access: false,
    },
    variables: [], // Could be extracted from content if needed
    example_prompts: extractExamplePrompts(content),
    tags: extractTags(titleMatch[1], descriptionMatch[1]),
    version: '1.0.0',
  };
}

// Extract example prompts from use cases
function extractExamplePrompts(content: string): string[] {
  const useCasesMatch = content.match(/## Use Cases\n([\s\S]+?)(?=\n##)/);
  if (!useCasesMatch) return [];

  return useCasesMatch[1]
    .split('\n')
    .filter(line => line.startsWith('- '))
    .map(line => line.substring(2).trim())
    .filter(line => line.length > 0);
}

// Generate tags from title and description
function extractTags(title: string, description: string): string[] {
  const tags: string[] = [];

  // Extract key words from title
  if (title.toLowerCase().includes('project')) tags.push('project-management');
  if (title.toLowerCase().includes('code')) tags.push('code-review');
  if (title.toLowerCase().includes('documentation')) tags.push('documentation');
  if (title.toLowerCase().includes('devops')) tags.push('devops');
  if (title.toLowerCase().includes('kubernetes'))
    tags.push('kubernetes', 'k8s');
  if (title.toLowerCase().includes('data')) tags.push('data-analysis');
  if (title.toLowerCase().includes('security')) tags.push('security');
  if (title.toLowerCase().includes('test')) tags.push('testing', 'qa');
  if (title.toLowerCase().includes('api')) tags.push('api-design');

  // Add MCP tag if mentioned
  if (description.toLowerCase().includes('mcp')) tags.push('mcp');

  // Add integration tags
  if (title.toLowerCase().includes('linear')) tags.push('linear');
  if (title.toLowerCase().includes('github')) tags.push('github');
  if (title.toLowerCase().includes('notion')) tags.push('notion');

  return [...new Set(tags)]; // Remove duplicates
}

// Main import function
async function importTemplates() {
  const templatesDir = join(__dirname, '../../context-proposals');

  try {
    const files = readdirSync(templatesDir).filter(
      file => file.endsWith('.md') && file !== 'README.md',
    );

    console.log(`Found ${files.length} template files to import`);

    for (const file of files) {
      const filePath = join(templatesDir, file);
      console.log(`\nProcessing ${file}...`);

      const template = parseTemplateFile(filePath);
      if (!template) {
        console.warn(`Skipping ${file} - could not parse`);
        continue;
      }

      // Check if template already exists
      const { data: existing } = await supabase
        .from('templates')
        .select('id')
        .eq('id', template.id)
        .single();

      if (existing) {
        console.log(`Template ${template.id} already exists, updating...`);
        const { error } = await supabase
          .from('templates')
          .update(template)
          .eq('id', template.id);

        if (error) {
          console.error(`Error updating template ${template.id}:`, error);
        } else {
          console.log(`✅ Updated template: ${template.name}`);
        }
      } else {
        console.log(`Creating new template ${template.id}...`);
        const { error } = await supabase.from('templates').insert(template);

        if (error) {
          console.error(`Error inserting template ${template.id}:`, error);
        } else {
          console.log(`✅ Created template: ${template.name}`);
        }
      }
    }

    console.log('\n✨ Template import completed!');

    // List all templates
    const { data: allTemplates } = await supabase
      .from('templates')
      .select('id, name, tags')
      .order('name');

    console.log('\nAvailable templates:');
    allTemplates?.forEach(t => {
      console.log(`- ${t.name} (${t.id}) [${t.tags?.join(', ') || 'no tags'}]`);
    });
  } catch (error) {
    console.error('Error importing templates:', error);
  }
}

// Run the import
importTemplates();
