import React, { useState, useRef, useEffect } from 'react';
import { Search, X, CheckCircle2 } from 'lucide-react';

export interface SearchableOption {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  searchKeywords?: string;
}

export interface SearchableSelectProps {
  label: string;
  sublabel?: string;
  selectedId: string;
  onSelect: (id: string) => void;
  options: SearchableOption[];
  icon: React.ReactNode;
  placeholder?: string;
  required?: boolean;
  emptyMessage?: string;
  layout?: 'grid' | 'stacked';
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  sublabel,
  selectedId,
  onSelect,
  options,
  icon,
  placeholder = 'Escribe para buscar o filtrar opciones...',
  required = true,
  emptyMessage = 'No se encontraron opciones coincidentes.',
  layout = 'grid',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.id === selectedId);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter((opt) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      opt.title.toLowerCase().includes(q) ||
      (opt.subtitle && opt.subtitle.toLowerCase().includes(q)) ||
      (opt.searchKeywords && opt.searchKeywords.toLowerCase().includes(q))
    );
  });

  const content = (
    <div className="relative w-full" ref={containerRef}>
      {selectedOption && !isOpen ? (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#f8faf7] border border-[#c8decb] hover:border-[#2d5a27] transition-all">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#eaf2eb] text-[#2d5a27] flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              {icon}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#122014] truncate">{selectedOption.title}</div>
              {selectedOption.subtitle && (
                <div className="text-[11px] text-[#5a725e] mt-0.5 truncate">
                  {selectedOption.subtitle}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setQuery('');
            }}
            className="px-3 py-1.5 text-xs font-semibold text-[#2d5a27] hover:bg-[#eaf2eb] rounded-xl transition-colors cursor-pointer border border-[#c8decb] shrink-0 ml-2"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-[#5a725e] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl text-xs bg-white border border-[#c8decb] text-[#122014] placeholder:text-[#88a58c] focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30 shadow-xs"
              autoFocus={isOpen}
            />
            {isOpen && (
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isOpen && (
            <div className="max-h-60 overflow-y-auto rounded-2xl bg-white border border-[#c8decb] shadow-xl p-1.5 space-y-1 z-30 absolute left-0 right-0 top-full mt-1 animate-fade-in">
              {filtered.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#5a725e]">
                  {emptyMessage}
                </div>
              ) : (
                filtered.map((opt) => {
                  const isSelected = opt.id === selectedId;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onSelect(opt.id);
                        setIsOpen(false);
                        setQuery('');
                      }}
                      className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#eaf2eb] text-[#2d5a27] font-semibold border border-[#c8decb]'
                          : 'hover:bg-[#f8faf7] text-[#122014]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                          isSelected ? 'bg-[#2d5a27] text-white' : 'bg-[#eaf2eb] text-[#2d5a27]'
                        }`}>
                          {icon}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{opt.title}</div>
                          {opt.subtitle && (
                            <div className="text-[11px] text-[#5a725e] truncate">{opt.subtitle}</div>
                          )}
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#2d5a27] shrink-0 ml-2" />}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (layout === 'stacked') {
    return (
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-[#122014]">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {sublabel && <p className="text-[11px] text-[#5a725e] mb-1.5">{sublabel}</p>}
        {content}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start pb-6 border-b border-[#e2ebe3]">
      <div>
        <label className="text-xs font-bold text-[#122014]">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {sublabel && <p className="text-[11px] text-[#5a725e] mt-0.5">{sublabel}</p>}
      </div>
      <div className="sm:col-span-2">
        {content}
      </div>
    </div>
  );
};
