import React from 'react';
import type { CarnetItem, UploadedImage } from './types';

type CarnetState = {
  images: UploadedImage[];
  items: CarnetItem[];
};

type CarnetActions = {
  setImages: (images: UploadedImage[]) => void;
  addImages: (images: UploadedImage[]) => void;
  removeImage: (id: string) => void;
  clearImages: () => void;

  setItems: (items: CarnetItem[]) => void;
  updateItem: (id: string, patch: Partial<CarnetItem>) => void;
  addItem: (item?: Partial<CarnetItem>) => void;
  removeItem: (id: string) => void;
  clearItems: () => void;
};

const CarnetContext = React.createContext<(CarnetState & CarnetActions) | null>(
  null
);

function makeImage(file: File): UploadedImage {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `img_${file.name}_${file.size}`,
    file,
    objectUrl: URL.createObjectURL(file),
  };
}

function makeBlankItem(): CarnetItem {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `item_${Date.now()}`,
    itemDescription: 'New item (be specific)',
    category: 'Other',
    quantity: 1,
    valueGbp: 0,
    countryOfOrigin: '',
    weightKg: undefined,
    serialNumber: 'N/A',
    notes: '',
  };
}

export function CarnetProvider({ children }: { children: React.ReactNode }) {
  const [images, setImagesState] = React.useState<UploadedImage[]>([]);
  const [items, setItemsState] = React.useState<CarnetItem[]>([]);

  const setImages = React.useCallback((next: UploadedImage[]) => {
    setImagesState((prev) => {
      for (const img of prev) URL.revokeObjectURL(img.objectUrl);
      return next;
    });
  }, []);

  const addImages = React.useCallback((incoming: UploadedImage[]) => {
    setImagesState((prev) => [...prev, ...incoming]);
  }, []);

  const removeImage = React.useCallback((id: string) => {
    setImagesState((prev) => {
      const target = prev.find((x) => x.id === id);
      if (target) URL.revokeObjectURL(target.objectUrl);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const clearImages = React.useCallback(() => {
    setImagesState((prev) => {
      for (const img of prev) URL.revokeObjectURL(img.objectUrl);
      return [];
    });
  }, []);

  const setItems = React.useCallback((next: CarnetItem[]) => {
    setItemsState(next);
  }, []);

  const updateItem = React.useCallback((id: string, patch: Partial<CarnetItem>) => {
    setItemsState((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  }, []);

  const addItem = React.useCallback((item?: Partial<CarnetItem>) => {
    setItemsState((prev) => [...prev, { ...makeBlankItem(), ...(item ?? {}) }]);
  }, []);

  const removeItem = React.useCallback((id: string) => {
    setItemsState((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const clearItems = React.useCallback(() => setItemsState([]), []);

  const value = React.useMemo(
    () => ({
      images,
      items,
      setImages,
      addImages,
      removeImage,
      clearImages,
      setItems,
      updateItem,
      addItem,
      removeItem,
      clearItems,
    }),
    [
      images,
      items,
      setImages,
      addImages,
      removeImage,
      clearImages,
      setItems,
      updateItem,
      addItem,
      removeItem,
      clearItems,
    ]
  );

  return <CarnetContext.Provider value={value}>{children}</CarnetContext.Provider>;
}

export function useCarnet() {
  const ctx = React.useContext(CarnetContext);
  if (!ctx) throw new Error('useCarnet must be used within CarnetProvider');
  return ctx;
}

export function filesToUploadedImages(files: FileList | File[]): UploadedImage[] {
  const arr = Array.from(files);
  return arr.map(makeImage);
}

