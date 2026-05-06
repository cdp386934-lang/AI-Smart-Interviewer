export function sanitizeMarkdown(input: string): string {
  return input.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
}
