import { useState, useEffect, useCallback } from 'react';
import { School } from '@/api/entities';
import { createPageUrl } from '@/utils';

const MAX_ITEMS = 4;
const STORAGE_KEY = 'greenpass-compare-programs';

// Simple localStorage management
const getCompareList = () => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const setCompareList = (items) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    // Trigger storage event manually for same-tab updates
    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEY,
      newValue: JSON.stringify(items)
    }));
  } catch (error) {
    console.error('Failed to save compare list:', error);
  }
};

export function useCompare() {
  const [items, setItems] = useState([]);
  const [isReady, setIsReady] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    setItems(getCompareList());
    setIsReady(true);
  }, []);

  // Listen for localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setItems(getCompareList());
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const add = useCallback((program) => {
    const currentItems = getCompareList();
    
    if (currentItems.length >= MAX_ITEMS) {
      return { error: `You can only compare up to ${MAX_ITEMS} programs at once.` };
    }
    
    if (currentItems.find(item => item.id === program.id)) {
      return { success: true }; // Already added
    }
    
    const newItem = {
      id: program.id,
      program_title: program.program_title,
      institution_name: program.institution_name,
      institution_logo_url: program.institution_logo_url,
    };
    
    const newItems = [...currentItems, newItem];
    setCompareList(newItems);
    setItems(newItems);
    
    return { success: true };
  }, []);

  const remove = useCallback((programId) => {
    const currentItems = getCompareList();
    const newItems = currentItems.filter(item => item.id !== programId);
    setCompareList(newItems);
    setItems(newItems);
  }, []);

  const clear = useCallback(() => {
    setCompareList([]);
    setItems([]);
  }, []);

  const contains = useCallback((programId) => {
    return items.some(item => item.id === programId);
  }, [items]);

  const isFull = useCallback(() => {
    return items.length >= MAX_ITEMS;
  }, [items]);

  const shareUrl = useCallback(() => {
    if (items.length === 0) return '';
    const url = new URL(createPageUrl('ComparePrograms'), window.location.origin);
    url.searchParams.set('ids', items.map(item => item.id).join(','));
    return url.toString();
  }, [items]);

  return {
    items,
    add,
    remove,
    clear,
    contains,
    isFull,
    shareUrl: shareUrl(),
    isReady
  };
}

export async function getComparedPrograms(programIds) {
  if (!programIds || programIds.length === 0) return [];
  
  try {
    console.log('Fetching programs for IDs:', programIds);
    const allPrograms = await School.list('', 1000);
    console.log('Total programs available:', allPrograms.length);
    
    const matchedPrograms = allPrograms.filter(program => 
      programIds.includes(program.id)
    );
    
    console.log('Matched programs:', matchedPrograms.length);
    
    // Sort to match the order of programIds
    const sortedPrograms = programIds.map(id => 
      matchedPrograms.find(program => program.id === id)
    ).filter(Boolean);
    
    return sortedPrograms;
  } catch (error) {
    console.error('Error fetching compared programs:', error);
    return [];
  }
}