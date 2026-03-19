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
};

export type UploadedImage = {
  id: string;
  file: File;
  objectUrl: string;
};

