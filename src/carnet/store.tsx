import React from 'react';
import type { AuditEvent, CarnetItem, ExtractionRun, UploadedImage } from './types';

type CarnetState = {
  projectName: string;
  images: UploadedImage[];
  items: CarnetItem[];
  extractionRuns: ExtractionRun[];
  auditEvents: AuditEvent[];
};

type CarnetActions = {
  setProjectName: (name: string) => void;

  setImages: (images: UploadedImage[]) => void;
  addImages: (images: UploadedImage[]) => void;
  removeImage: (id: string) => void;
  clearImages: () => void;

  setItems: (
    items: CarnetItem[] | ((prev: CarnetItem[]) => CarnetItem[])
  ) => void;
  updateItem: (id: string, patch: Partial<CarnetItem>) => void;
  addItem: (item?: Partial<CarnetItem>) => void;
  removeItem: (id: string) => void;
  clearItems: () => void;

  addExtractionRun: (run: Omit<ExtractionRun, 'id' | 'createdAt'>) => void;
  addAuditEvent: (event: Omit<AuditEvent, 'id' | 'createdAt'>) => void;
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

const STORAGE_KEY = 'carnetai_project_v2';

type PersistedCarnet = {
  projectName: string;
  items: CarnetItem[];
  extractionRuns: ExtractionRun[];
  auditEvents: AuditEvent[];
};

function loadPersisted(): PersistedCarnet | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      projectName:
        typeof parsed.projectName === 'string'
          ? parsed.projectName
          : 'Untitled Carnet Project',
      items: Array.isArray(parsed.items) ? parsed.items : [],
      extractionRuns: Array.isArray(parsed.extractionRuns)
        ? parsed.extractionRuns
        : [],
      auditEvents: Array.isArray(parsed.auditEvents) ? parsed.auditEvents : [],
    };
  } catch {
    return null;
  }
}

export function CarnetProvider({ children }: { children: React.ReactNode }) {
  const initial = React.useMemo(() => {
    if (typeof window === 'undefined') return null;
    return loadPersisted();
  }, []);
  const [projectName, setProjectNameState] = React.useState<string>(
    initial?.projectName ?? 'Untitled Carnet Project'
  );
  const [images, setImagesState] = React.useState<UploadedImage[]>([]);
  const [items, setItemsState] = React.useState<CarnetItem[]>(
    initial?.items ?? []
  );
  const [extractionRuns, setExtractionRuns] = React.useState<ExtractionRun[]>(
    initial?.extractionRuns ?? []
  );
  const [auditEvents, setAuditEvents] = React.useState<AuditEvent[]>(
    initial?.auditEvents ?? []
  );

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload: PersistedCarnet = {
      projectName,
      items,
      extractionRuns,
      auditEvents,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [projectName, items, extractionRuns, auditEvents]);

  const setProjectName = React.useCallback((name: string) => {
    setProjectNameState(name.trim() || 'Untitled Carnet Project');
  }, []);

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

  const setItems = React.useCallback(
    (next: CarnetItem[] | ((prev: CarnetItem[]) => CarnetItem[])) => {
      setItemsState((prev) =>
        typeof next === 'function'
          ? (next as (prev: CarnetItem[]) => CarnetItem[])(prev)
          : next
      );
    },
    []
  );

  const addExtractionRun = React.useCallback(
    (run: Omit<ExtractionRun, 'id' | 'createdAt'>) => {
      const now = new Date().toISOString();
      setExtractionRuns((prev) => [
        {
          id: globalThis.crypto?.randomUUID?.() ?? `run_${Date.now()}`,
          createdAt: now,
          ...run,
        },
        ...prev,
      ]);
    },
    []
  );

  const addAuditEvent = React.useCallback(
    (event: Omit<AuditEvent, 'id' | 'createdAt'>) => {
      const now = new Date().toISOString();
      setAuditEvents((prev) => [
        {
          id: globalThis.crypto?.randomUUID?.() ?? `evt_${Date.now()}`,
          createdAt: now,
          ...event,
        },
        ...prev,
      ]);
    },
    []
  );

  const addItem = React.useCallback(
    (item?: Partial<CarnetItem>) => {
      setItemsState((prev) => [...prev, { ...makeBlankItem(), ...(item ?? {}) }]);
      addAuditEvent({
        type: 'item_added_manual',
        message: 'Manually added a new item row.',
      });
    },
    [addAuditEvent]
  );

  const removeItem = React.useCallback(
    (id: string) => {
      setItemsState((prev) => prev.filter((it) => it.id !== id));
      addAuditEvent({
        type: 'item_removed_manual',
        message: 'Removed an item row.',
      });
    },
    [addAuditEvent]
  );

  const clearItems = React.useCallback(() => {
    setItemsState([]);
  }, []);
  const updateItem = React.useCallback((id: string, patch: Partial<CarnetItem>) => {
    setItemsState((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  }, []);

  const value = React.useMemo(
    () => ({
      projectName,
      images,
      items,
      extractionRuns,
      auditEvents,
      setProjectName,
      setImages,
      addImages,
      removeImage,
      clearImages,
      setItems,
      updateItem,
      addItem,
      removeItem,
      clearItems,
      addExtractionRun,
      addAuditEvent,
    }),
    [
      projectName,
      images,
      items,
      extractionRuns,
      auditEvents,
      setProjectName,
      setImages,
      addImages,
      removeImage,
      clearImages,
      setItems,
      updateItem,
      addItem,
      removeItem,
      clearItems,
      addExtractionRun,
      addAuditEvent,
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

