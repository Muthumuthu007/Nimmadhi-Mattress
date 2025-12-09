import React from 'react';
import { RawMaterial } from '../types';

interface StockLimitInputProps {
  material: RawMaterial;
  value: string;
  onChange: (value: string) => void;
}

export const StockLimitInput: React.FC<StockLimitInputProps> = ({
  material,
  value,
  onChange,
}) => {
  return (
    <div className="flex items-center space-x-2">
      <input
        type="number"
        min="0"
        className="w-20 px-2 py-1 border rounded text-sm"
        placeholder="Limit"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="text-sm text-gray-500">{material.unit}</span>
    </div>
  );
};