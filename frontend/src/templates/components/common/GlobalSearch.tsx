import React, { useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';

interface GlobalSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  onSearch,
  placeholder = 'Search in Settings and perform actions'
}) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <div className="global-search-container" style={{
      display: 'flex',
      justifyContent: 'center',
      padding: '16px 20px 14px 20px',
      width: '100%'
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          border: '1px solid #c9d5df',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '680px',
          height: '38px',
          padding: '0 12px 0 16px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
        }}
      >
        <Search size={16} color="#6b7280" style={{ marginRight: '10px', flexShrink: 0 }} />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onSearch(e.target.value);
          }}
          placeholder={placeholder}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: '13.5px',
            color: '#1f2937',
            backgroundColor: 'transparent',
            fontFamily: 'inherit'
          }}
        />
        <button
          type="submit"
          title="Search"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1f2937',
            borderRadius: '50%'
          }}
        >
          <ArrowRight size={17} />
        </button>
      </form>
    </div>
  );
};
