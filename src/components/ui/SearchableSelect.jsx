import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Plus } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Modern Searchable Select / Combobox component
 *
 * @param {object} props
 * @param {string} props.value - Selected value
 * @param {function} props.onChange - (value: string) => void
 * @param {Array<{value: string, label: string, sublabel?: string, searchKeywords?: string}>} props.options
 * @param {string} [props.placeholder='Select an option...']
 * @param {string} [props.searchPlaceholder='Search...']
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.required=false]
 * @param {string} [props.error]
 * @param {string} [props.className]
 * @param {string} [props.addNewText] - E.g. "+ Add New Product..."
 * @param {function} [props.onAddNew] - (currentSearchText: string) => void
 */
export function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  disabled = false,
  required = false,
  error,
  className,
  addNewText,
  onAddNew
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return options.find(opt => String(opt.value) === String(value));
  }, [options, value]);

  // Filter options based on query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter(opt => {
      const labelMatch = opt.label?.toLowerCase().includes(q);
      const sublabelMatch = opt.sublabel?.toLowerCase().includes(q);
      const keywordsMatch = opt.searchKeywords?.toLowerCase().includes(q);
      return labelMatch || sublabelMatch || keywordsMatch;
    });
  }, [options, searchQuery]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      // Small timeout ensures element is mounted and animated
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
      scrollHighlightedIntoView(highlightedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
      scrollHighlightedIntoView(highlightedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex].value);
      } else if (onAddNew && searchQuery.trim()) {
        handleAddNewClick();
      }
    }
  };

  const scrollHighlightedIntoView = (index) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-combobox-item]');
    if (items[index]) {
      items[index].scrollIntoView({ block: 'nearest' });
    }
  };

  const handleSelect = (val) => {
    onChange?.(val);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.('');
    setIsOpen(false);
  };

  const handleAddNewClick = () => {
    const text = searchQuery;
    setIsOpen(false);
    onAddNew?.(text);
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full', className)}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden input for native form validation if required */}
      <input
        type="text"
        tabIndex={-1}
        className="opacity-0 pointer-events-none absolute left-0 bottom-0 w-full h-0"
        value={value || ''}
        required={required}
        onChange={() => {}}
      />

      {/* Main Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          'w-full flex items-center justify-between text-left px-3 py-2 rounded-lg border text-sm transition-all duration-150',
          'bg-white focus:outline-none focus:ring-2',
          disabled
            ? 'bg-surface-50 text-surface-400 border-surface-200 cursor-not-allowed opacity-75'
            : isOpen
              ? 'border-primary-500 ring-2 ring-primary-500/20'
              : error
                ? 'border-danger-500 ring-2 ring-danger-500/20'
                : 'border-surface-300 hover:border-surface-400 text-surface-900 cursor-pointer'
        )}
      >
        <span className="truncate pr-2">
          {selectedOption ? (
            <span className="font-medium text-surface-900">
              {selectedOption.label}
              {selectedOption.sublabel && (
                <span className="ml-1.5 text-xs text-surface-500 font-normal">
                  ({selectedOption.sublabel})
                </span>
              )}
            </span>
          ) : (
            <span className="text-surface-400">{placeholder}</span>
          )}
        </span>

        <div className="flex items-center gap-1 shrink-0 text-surface-400">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-surface-100 hover:text-surface-700 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn('w-4 h-4 transition-transform duration-200', isOpen && 'rotate-180 text-primary-600')}
          />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl border border-surface-200 shadow-xl overflow-hidden animate-scale-in">
          {/* Search Input Box */}
          <div className="p-2 border-b border-surface-100 bg-surface-50/70 flex items-center gap-2">
            <Search className="w-4 h-4 text-surface-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder={searchPlaceholder}
              className="w-full text-xs sm:text-sm bg-transparent border-0 focus:outline-none placeholder:text-surface-400 text-surface-900 py-1"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-surface-400 hover:text-surface-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Add Action (Top of List) */}
          {onAddNew && (
            <button
              type="button"
              onClick={handleAddNewClick}
              className="w-full text-left px-3.5 py-2 text-xs font-semibold text-primary-600 bg-primary-50/60 hover:bg-primary-100/80 flex items-center gap-2 transition-colors border-b border-primary-100 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{addNewText || '+ Add New Item'}</span>
            </button>
          )}

          {/* Options List */}
          <div ref={listRef} className="max-h-56 overflow-y-auto divide-y divide-surface-50 py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.value}
                    data-combobox-item
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      'px-3.5 py-2 cursor-pointer flex items-center justify-between transition-colors text-sm',
                      isSelected
                        ? 'bg-primary-50 text-primary-900 font-medium'
                        : isHighlighted
                          ? 'bg-surface-100 text-surface-900'
                          : 'text-surface-800 hover:bg-surface-50'
                    )}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-xs text-surface-400 truncate mt-0.5">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary-600 shrink-0" />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center">
                <p className="text-xs text-surface-500">
                  No matches found for <strong className="text-surface-700">"{searchQuery}"</strong>
                </p>
                {onAddNew && (
                  <button
                    type="button"
                    onClick={handleAddNewClick}
                    className="mt-2 text-xs text-primary-600 hover:text-primary-700 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add "{searchQuery}" as new
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default SearchableSelect;
