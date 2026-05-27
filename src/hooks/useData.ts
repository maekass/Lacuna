import { useState, useEffect, useCallback, useMemo } from 'react';
import { Company, Acquisition, DealMetrics } from '@/lib/types';
import { Validation } from '@/lib/validation';
import { Analytics } from '@/lib/analytics';

// Data loading states
type LoadingState = 'idle' | 'loading' | 'success' | 'error';

interface UseDataResult {
  readonly companies: readonly Company[];
  readonly acquisitions: readonly Acquisition[];
  readonly metrics: DealMetrics | null;
  readonly state: LoadingState;
  readonly errors: readonly string[];
  readonly refresh: () => void;
  readonly isValid: boolean;
}

// Sophisticated data hook with validation
export function useData(
  rawCompanies: unknown[],
  rawAcquisitions: unknown[]
): UseDataResult {
  const [state, setState] = useState<LoadingState>('idle');
  const [errors, setErrors] = useState<string[]>([]);
  const [data, setData] = useState<{
    companies: Company[];
    acquisitions: Acquisition[];
  }>({ companies: [], acquisitions: [] });

  // Manual refresh counter
  const [refreshCounter, setRefreshCounter] = useState(0);
  const refresh = useCallback(() => {
    setRefreshCounter(c => c + 1);
  }, []);

  // Load data effect - validates on mount, data changes, or manual refresh
  useEffect(() => {
    let isCancelled = false;
    
    const validateAndLoad = () => {
      if (isCancelled) return;
      
      setState('loading');
      setErrors([]);

      try {
        // Validate companies
        const companyResult = Validation.companies(rawCompanies);
        
        // Validate acquisitions
        const acquisitionErrors: string[] = [];
        const validAcquisitions: Acquisition[] = [];
        
        rawAcquisitions.forEach((item, index) => {
          const result = Validation.acquisition(item);
          if (result.isValid && result.data) {
            validAcquisitions.push(result.data);
          } else {
            acquisitionErrors.push(`[${index}]: ${result.errors.join(', ')}`);
          }
        });

        const allErrors = [...companyResult.errors, ...acquisitionErrors];
        
        if (allErrors.length > 0) {
          setErrors(allErrors);
          setState('error');
          return;
        }

        if (companyResult.data && !isCancelled) {
          setData({
            companies: companyResult.data,
            acquisitions: validAcquisitions
          });
          setState('success');
        }
      } catch (error) {
        if (!isCancelled) {
          setErrors([error instanceof Error ? error.message : 'Unknown error']);
          setState('error');
        }
      }
    };

    validateAndLoad();
    
    return () => { isCancelled = true; };
  }, [rawCompanies, rawAcquisitions, refreshCounter]);

  const metrics = useMemo(() => {
    if (data.acquisitions.length === 0) return null;
    return Analytics.calculateDealMetrics(data.acquisitions);
  }, [data.acquisitions]);

  return {
    companies: data.companies,
    acquisitions: data.acquisitions,
    metrics,
    state,
    errors,
    refresh,
    isValid: state === 'success' && errors.length === 0
  };
}

// Window size hook for responsive design
interface WindowSize {
  readonly width: number;
  readonly height: number;
  readonly isMobile: boolean;
  readonly isTablet: boolean;
  readonly isDesktop: boolean;
}

export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
    isMobile: false,
    isTablet: false,
    isDesktop: true
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setSize({
        width,
        height: window.innerHeight,
        isMobile: width < 640,
        isTablet: width >= 640 && width < 1024,
        isDesktop: width >= 1024
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

// Debounced value hook
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

