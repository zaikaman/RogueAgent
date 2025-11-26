/**
 * Text Utility Functions
 * Helpers for cleaning and processing text content
 */

/**
 * Clean signal/tweet text by removing errant backslashes
 * Sometimes tweet formats use \ as line separators which need to be removed
 * 
 * Examples:
 * - "entry: $0.046\" -> "entry: $0.046"
 * - "target: $0.0536 (+16.5%)\" -> "target: $0.0536 (+16.5%)"
 * - "r:r: 1:2.5\" -> "r:r: 1:2.5"
 * 
 * @param text The raw text to clean
 * @returns Cleaned text with backslashes removed
 */
export function cleanSignalText(text: string): string {
  if (!text) return text;
  
  // Remove trailing backslashes that are used as line separators
  // This pattern matches a backslash followed by optional whitespace and newline (or end of string)
  let cleaned = text.replace(/\\(\s*\n|\s*$)/g, '\n');
  
  // Also handle cases where backslash is at the end of lines without proper newlines
  // e.g., "entry: $0.046\" becomes "entry: $0.046"
  cleaned = cleaned.replace(/\\$/gm, '');
  
  // Handle double backslash-newline sequences that may appear in some formats
  cleaned = cleaned.replace(/\\\\/g, '');
  
  // Clean up any resulting double newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Trim trailing whitespace from each line
  cleaned = cleaned.split('\n').map(line => line.trimEnd()).join('\n');
  
  return cleaned.trim();
}

/**
 * Normalize line endings to Unix style
 * @param text Text with potentially mixed line endings
 * @returns Text with Unix line endings
 */
export function normalizeLineEndings(text: string): string {
  if (!text) return text;
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Clean and normalize text for display
 * Combines multiple text cleaning operations
 * @param text Raw text to process
 * @returns Cleaned and normalized text
 */
export function cleanText(text: string): string {
  if (!text) return text;
  
  let result = normalizeLineEndings(text);
  result = cleanSignalText(result);
  
  return result;
}
