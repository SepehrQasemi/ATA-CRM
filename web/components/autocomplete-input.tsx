"use client";

import { useMemo, useState } from "react";

type AutocompleteInputProps = {
  value: string;
  onChange: (nextValue: string) => void;
  suggestions: string[];
  placeholder?: string;
  listId?: string;
};

export function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  listId,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);

  const visibleSuggestions = useMemo(() => {
    const seen = new Set<string>();
    return suggestions
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => {
        const key = item.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 5);
  }, [suggestions]);

  const showList = open && value.trim().length > 0 && visibleSuggestions.length > 0;

  return (
    <div className="autocomplete">
      <input
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {showList ? (
        <div id={listId} className="autocomplete-list" role="listbox">
          {visibleSuggestions.map((item) => (
            <button
              key={item}
              type="button"
              className="autocomplete-option"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(item);
                setOpen(false);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
