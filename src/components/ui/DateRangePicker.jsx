import React from 'react';
import { Calendar } from 'lucide-react';
import { Input } from './Input';

export function DateRangePicker({ startDate, endDate, onStartChange, onEndChange, className = '' }) {
  // Convert JS Date to YYYY-MM-DD for input value
  const formatDateForInput = (dateObj) => {
    if (!dateObj) return '';
    const d = new Date(dateObj);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const handleStartChange = (e) => {
    if (!e.target.value) onStartChange(null);
    else onStartChange(new Date(e.target.value));
  };

  const handleEndChange = (e) => {
    if (!e.target.value) onEndChange(null);
    else onEndChange(new Date(e.target.value));
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex-1">
        <Input
          type="date"
          value={formatDateForInput(startDate)}
          onChange={handleStartChange}
          className="pl-9"
          placeholder="Start Date"
        />
        <Calendar className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
      </div>
      <span className="text-surface-500 font-medium px-1">to</span>
      <div className="relative flex-1">
        <Input
          type="date"
          value={formatDateForInput(endDate)}
          onChange={handleEndChange}
          className="pl-9"
          placeholder="End Date"
        />
        <Calendar className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
      </div>
    </div>
  );
}
