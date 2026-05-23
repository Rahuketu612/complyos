/**
 * File Upload Security Constants
 * 
 * Provides MIME type whitelist and file size limits.
 * Used by all services handling file uploads.
 */

// Allowed MIME types for document uploads
export const ALLOWED_MIME_TYPES = {
  // Documents
  'application/pdf': 'PDF Document',
  'application/msword': 'Word Document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document (DOCX)',
  'application/vnd.ms-excel': 'Excel Spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet (XLSX)',
  'application/vnd.ms-powerpoint': 'PowerPoint Presentation',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint (PPTX)',
  
  // Images
  'image/jpeg': 'JPEG Image',
  'image/png': 'PNG Image',
  'image/gif': 'GIF Image',
  'image/webp': 'WebP Image',
  
  // Text
  'text/plain': 'Text File',
  'text/csv': 'CSV File',
  
  // Compressed (for archives only)
  'application/zip': 'ZIP Archive',
  'application/x-rar-compressed': 'RAR Archive',
} as const;

// Maximum file sizes (in bytes)
export const FILE_SIZE_LIMITS = {
  // Default max file size: 10MB
  DEFAULT: 10 * 1024 * 1024, // 10 MB
  
  // Specific limits by category
  DOCUMENTS: 25 * 1024 * 1024,    // 25 MB
  IMAGES: 5 * 1024 * 1024,         // 5 MB
  ARCHIVES: 50 * 1024 * 1024,      // 50 MB
  SPREADSHEETS: 15 * 1024 * 1024,   // 15 MB
  
  // Total upload limit per request
  TOTAL_PER_REQUEST: 100 * 1024 * 1024, // 100 MB
} as const;

// Dangerous file extensions (never allow)
export const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.msi', '.dll', 
  '.sh', '.bash', '.bin', '.app',
  '.scr', '.pif', '.vbs', '.js', '.jse',
  '.com', '.hta', '.cpl', '.msc',
  '.php', '.phtml', '.phar', '.phps',
  '.asp', '.aspx', '.cer', '.cgi',
  '.jsp', '.do', '.action',
] as const;

/**
 * Validate MIME type against whitelist
 */
export function isAllowedMimeType(mimeType: string): boolean {
  return mimeType in ALLOWED_MIME_TYPES;
}

/**
 * Validate file extension against blocked list
 */
export function isBlockedExtension(fileName: string): boolean {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  return BLOCKED_EXTENSIONS.includes(ext as typeof BLOCKED_EXTENSIONS[number]);
}

/**
 * Get max file size for a given MIME type
 */
export function getMaxSizeForMimeType(mimeType: string): number {
  if (mimeType.startsWith('image/')) {
    return FILE_SIZE_LIMITS.IMAGES;
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return FILE_SIZE_LIMITS.SPREADSHEETS;
  }
  if (mimeType.includes('zip') || mimeType.includes('rar')) {
    return FILE_SIZE_LIMITS.ARCHIVES;
  }
  return FILE_SIZE_LIMITS.DEFAULT;
}

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate file metadata before upload
 */
export function validateFileMetadata(
  fileName: string,
  mimeType: string,
  size: number,
): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check extension
  if (isBlockedExtension(fileName)) {
    errors.push(`File extension not allowed for security reasons: ${fileName}`);
  }
  
  // Check MIME type
  if (!isAllowedMimeType(mimeType)) {
    errors.push(`File type not allowed: ${mimeType}. Allowed types: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`);
  }
  
  // Check size
  const maxSize = getMaxSizeForMimeType(mimeType);
  if (size > maxSize) {
    errors.push(`File size exceeds maximum allowed (${maxSize / (1024 * 1024)}MB) for type ${mimeType}`);
  }
  
  // Warning for large files
  if (size > FILE_SIZE_LIMITS.DEFAULT && errors.length === 0) {
    warnings.push(`Large file upload (${(size / (1024 * 1024)).toFixed(2)}MB) - consider compression`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Virus scanning hook - TODO: integrate with actual scanner
 * 
 * In production, integrate with:
 * - ClamAV (open source)
 * - VirusTotal API
 * - AWS Macie
 * - Azure Defender
 */
export interface VirusScanResult {
  clean: boolean;
  scanner: string;
  scannedAt: string;
  threatName?: string;
}

/**
 * Scan file for viruses (placeholder)
 */
export async function scanFileForViruses(_fileBuffer: Buffer, _fileName: string): Promise<VirusScanResult> {
  // TODO: Integrate with actual virus scanning service
  // For now, return clean result
  return {
    clean: true,
    scanner: 'NOT_IMPLEMENTED',
    scannedAt: new Date().toISOString(),
  };
}
