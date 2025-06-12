
'use client';

import * as React from 'react';
import { X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Command as CommandPrimitive } from 'cmdk';
import { cn } from '@/lib/utils';

type Option = Record<'value' | 'label', string>;

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>> | ((selected: string[]) => void);
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select options...',
  className,
  disabled,
  ...props
}: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  const handleSelect = React.useCallback(
    (option: Option) => {
      if (typeof onChange === 'function') {
        const newSelected = selected.includes(option.value)
          ? selected.filter((s) => s !== option.value)
          : [...selected, option.value];
        onChange(newSelected);
      }
      setInputValue(''); // Clear input after selection
    },
    [onChange, selected]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (input) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (input.value === '' && selected.length > 0) {
            if (typeof onChange === 'function') {
              const newSelected = selected.slice(0, -1);
              onChange(newSelected);
            }
          }
        }
        if (e.key === 'Escape') {
          input.blur();
        }
      }
    },
    [onChange, selected]
  );

  const selectedObjects = selected
    .map((sValue) => options.find((opt) => opt.value === sValue))
    .filter((v): v is Option => v !== undefined);

  const selectableOptions = options.filter(
    (option) => !selected.includes(option.value)
  );

  return (
    <Command
      onKeyDown={handleKeyDown}
      className={cn('overflow-visible bg-transparent', className)}
      {...props}
    >
      <div
        className={cn(
          'group rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
           disabled && "cursor-not-allowed opacity-50"
        )}
        onClick={() => !disabled && setOpen(true)}
      >
        <div className="flex flex-wrap gap-1.5">
          {selectedObjects.map((option) => {
            return (
              <Badge
                key={option.value}
                variant="secondary"
                className={cn(disabled && "cursor-not-allowed opacity-50")}
              >
                {option.label}
                <button
                  className={cn(
                    'ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2',
                    disabled && "pointer-events-none"
                  )}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                       !disabled && handleSelect(option);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => !disabled && handleSelect(option)}
                  disabled={disabled}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            );
          })}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            placeholder={selectedObjects.length === 0 ? placeholder : ''}
            className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            disabled={disabled}
          />
        </div>
      </div>
      <div className="relative mt-2">
        {open && selectableOptions.length > 0 ? (
          <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
            <CommandList>
              <CommandGroup className="h-full overflow-auto">
                {selectableOptions.map((option) => {
                  return (
                    <CommandItem
                      key={option.value}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onSelect={() => {
                        handleSelect(option);
                      }}
                      className={'cursor-pointer'}
                    >
                      {option.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </div>
        ) : null}
      </div>
    </Command>
  );
}
