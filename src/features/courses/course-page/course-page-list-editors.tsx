'use client';

import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';

// Editing controls for the course page editor's lists: add, remove and reorder items, with each
// item a single line, a paragraph, or a small group of fields (label + value, question + answer).

const FIELD_CLASSES =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800';

export function FieldLabel({ label, help, htmlFor }: { label: string; help?: ReactNode; htmlFor?: string }) {
  return (
    <div className="mb-2">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-900">
        {label}
      </label>
      {help && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{help}</p>}
    </div>
  );
}

export function TextField({
  id,
  value,
  onChange,
  placeholder,
  maxLength,
  multiline = false,
  rows = 3,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  rows?: number;
}) {
  return multiline ? (
    <textarea
      id={id}
      value={value}
      onChange={(changeEvent) => onChange(changeEvent.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      rows={rows}
      className={`${FIELD_CLASSES} resize-y leading-relaxed`}
    />
  ) : (
    <input
      id={id}
      value={value}
      onChange={(changeEvent) => onChange(changeEvent.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      className={FIELD_CLASSES}
    />
  );
}

function moveItem<Item>(items: Item[], fromIndex: number, toIndex: number): Item[] {
  if (toIndex < 0 || toIndex >= items.length) return items;
  const reordered = [...items];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved as Item);
  return reordered;
}

function RowControls({
  index,
  count,
  itemName,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  itemName: string;
  onMove: (toIndex: number) => void;
  onRemove: () => void;
}) {
  const buttonClasses =
    'flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-navy-900 disabled:pointer-events-none disabled:opacity-30';
  return (
    <div className="flex shrink-0 items-start gap-0.5 pt-1">
      <button type="button" onClick={() => onMove(index - 1)} disabled={index === 0} aria-label={`Move ${itemName} ${index + 1} up`} className={buttonClasses}>
        <Icon name="chevronDown" className="h-4 w-4 rotate-180" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => onMove(index + 1)}
        disabled={index === count - 1}
        aria-label={`Move ${itemName} ${index + 1} down`}
        className={buttonClasses}
      >
        <Icon name="chevronDown" className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${itemName} ${index + 1}`}
        className={`${buttonClasses} hover:bg-red-50 hover:text-red-600`}
      >
        <Icon name="close" className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-navy-800 hover:text-navy-900"
    >
      <Icon name="plus" className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}

export function TextListEditor({
  label,
  help,
  items,
  onChange,
  itemName,
  multiline = false,
  placeholder,
  maxLength,
}: {
  label: string;
  help?: ReactNode;
  items: string[];
  onChange: (items: string[]) => void;
  // Used in button labels: "Add objective", "Remove objective 2".
  itemName: string;
  multiline?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <FieldLabel label={label} help={help} />
      {items.length > 0 && (
        <ol className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="w-5 shrink-0 pt-2 text-right text-xs font-semibold text-slate-400">{index + 1}.</span>
              <div className="min-w-0 flex-1">
                <TextField
                  value={item}
                  onChange={(value) => onChange(items.map((existing, itemIndex) => (itemIndex === index ? value : existing)))}
                  placeholder={placeholder}
                  maxLength={maxLength}
                  multiline={multiline}
                  rows={2}
                />
              </div>
              <RowControls
                index={index}
                count={items.length}
                itemName={itemName}
                onMove={(toIndex) => onChange(moveItem(items, index, toIndex))}
                onRemove={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
              />
            </li>
          ))}
        </ol>
      )}
      <AddButton label={`Add ${itemName}`} onClick={() => onChange([...items, ''])} />
    </fieldset>
  );
}

export interface ObjectListField<Key extends string> {
  key: Key;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
}

export function ObjectListEditor<Key extends string>({
  label,
  help,
  items,
  onChange,
  itemName,
  fields,
  layout = 'stacked',
  renderItemNote,
}: {
  label: string;
  help?: ReactNode;
  items: Record<Key, string>[];
  onChange: (items: Record<Key, string>[]) => void;
  itemName: string;
  fields: ObjectListField<Key>[];
  // 'row' puts short fields side by side (label + value); 'stacked' puts them one under another.
  layout?: 'row' | 'stacked';
  renderItemNote?: (item: Record<Key, string>) => ReactNode;
}) {
  const emptyItem = Object.fromEntries(fields.map((field) => [field.key, ''])) as Record<Key, string>;

  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <FieldLabel label={label} help={help} />
      {items.length > 0 && (
        <ol className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className={`grid min-w-0 flex-1 gap-2 ${layout === 'row' ? 'sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]' : ''}`}>
                {fields.map((field) => (
                  <label key={field.key} className="block">
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{field.label}</span>
                    <TextField
                      value={item[field.key]}
                      onChange={(value) =>
                        onChange(items.map((existing, itemIndex) => (itemIndex === index ? { ...existing, [field.key]: value } : existing)))
                      }
                      placeholder={field.placeholder}
                      multiline={field.multiline}
                      maxLength={field.maxLength}
                      rows={2}
                    />
                  </label>
                ))}
                {renderItemNote?.(item)}
              </div>
              <RowControls
                index={index}
                count={items.length}
                itemName={itemName}
                onMove={(toIndex) => onChange(moveItem(items, index, toIndex))}
                onRemove={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
              />
            </li>
          ))}
        </ol>
      )}
      <AddButton label={`Add ${itemName}`} onClick={() => onChange([...items, { ...emptyItem }])} />
    </fieldset>
  );
}
