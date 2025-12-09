import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface QuickAddInputProps {
    label: string;
    id: string;
    value: string | number;
    onChange: (value: string) => void;
    storageKey: string;
    type?: 'text' | 'number' | 'date';
    placeholder?: string;
    required?: boolean;
    step?: string;
    min?: string;
    className?: string;
}

const QuickAddInput: React.FC<QuickAddInputProps> = ({
    label,
    id,
    value,
    onChange,
    storageKey,
    type = 'text',
    placeholder,
    required = false,
    step,
    min,
    className = '',
}) => {
    const [options, setOptions] = useState<string[]>([]);

    useEffect(() => {
        const savedOptions = localStorage.getItem(storageKey);
        if (savedOptions) {
            try {
                setOptions(JSON.parse(savedOptions));
            } catch (e) {
                console.error('Failed to parse saved options for', storageKey, e);
                setOptions([]);
            }
        }
    }, [storageKey]);

    const handleAddOption = () => {
        const newOption = window.prompt(`Enter new ${label}:`);
        if (newOption && newOption.trim()) {
            const trimmedOption = newOption.trim();
            if (!options.includes(trimmedOption)) {
                const updatedOptions = [...options, trimmedOption].sort();
                setOptions(updatedOptions);
                localStorage.setItem(storageKey, JSON.stringify(updatedOptions));
                onChange(trimmedOption); // Auto-select the new option
            } else {
                onChange(trimmedOption); // Select existing if typed
            }
        }
    };

    const handleDeleteOption = () => {
        const valueToDelete = String(value).trim();
        if (!valueToDelete) return;

        if (options.includes(valueToDelete)) {
            if (window.confirm(`Are you sure you want to delete "${valueToDelete}" from the saved list?`)) {
                const updatedOptions = options.filter(opt => opt !== valueToDelete);
                setOptions(updatedOptions);
                localStorage.setItem(storageKey, JSON.stringify(updatedOptions));
                onChange(''); // Clear the input
            }
        } else {
            alert(`"${valueToDelete}" is not in the saved list.`);
        }
    };

    return (
        <div className={className}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={id}>
                {label} {required && '*'}
            </label>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <input
                        type={type}
                        id={id}
                        list={`${id}-list`}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        required={required}
                        step={step}
                        min={min}
                        autoComplete="off"
                    />
                    <datalist id={`${id}-list`}>
                        {options.map((option) => (
                            <option key={option} value={option} />
                        ))}
                    </datalist>
                </div>
                <button
                    type="button"
                    onClick={handleAddOption}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    title={`Add new ${label}`}
                >
                    <Plus className="h-5 w-5" />
                </button>
                <button
                    type="button"
                    onClick={handleDeleteOption}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 text-red-600 dark:text-red-400 shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    title={`Delete selected ${label}`}
                >
                    <Trash2 className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

export default QuickAddInput;
