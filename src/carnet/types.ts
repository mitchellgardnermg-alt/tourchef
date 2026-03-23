export type CarnetCategory =
  | 'Kitchen Equipment'
  | 'Utensils'
  | 'Electrical Equipment'
  | 'Furniture'
  | 'Production Equipment'
  | 'Instruments'
  | 'Audio Equipment'
  | 'Lighting'
  | 'Other';

export type CarnetItem = {
  id: string;
  itemDescription: string;
  category: CarnetCategory;
  quantity: number;
  valueGbp: number;
  countryOfOrigin: string;
  weightKg?: number;
  serialNumber: string;
  notes: string;
  aiConfidence?: number;
  aiEvidence?: string;
  aiValueEstimated?: boolean;
  aiValueEstimateReason?: string;
};

export type UploadedImage = {
  id: string;
  file: File;
  objectUrl: string;
};

export type ExtractionRunSource = 'dashboard' | 'results_upload_more';

export type ExtractionRun = {
  id: string;
  createdAt: string;
  source: ExtractionRunSource;
  imageCount: number;
  extractedItemCount: number;
};

export type AuditEventType =
  | 'items_generated'
  | 'items_appended'
  | 'item_added_manual'
  | 'item_removed_manual'
  | 'export_pdf'
  | 'export_excel';

export type AuditEvent = {
  id: string;
  createdAt: string;
  type: AuditEventType;
  message: string;
};

