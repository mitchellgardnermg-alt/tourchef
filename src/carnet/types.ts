export type CarnetCategory =
  | 'Kitchen'
  | 'Production'
  | 'Instruments'
  | 'Audio'
  | 'Lighting'
  | 'Backline'
  | 'IT'
  | 'Other';

export type CarnetItem = {
  id: string;
  itemName: string;
  category: CarnetCategory;
  quantity: number;
  estimatedValueGbp: number;
  notes: string;
};

export type UploadedImage = {
  id: string;
  file: File;
  objectUrl: string;
};

