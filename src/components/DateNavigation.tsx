import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface DateNavigationProps {
  selectedDate: string; // YYYYMMDD
  onSelectDate: (dateStr: string) => void;
  gameCountsByDate?: Record<string, number>;
}

export const DateNavigation: React.FC<DateNavigationProps> = ({
  selectedDate,
  onSelectDate
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Parse selected date string into Date object
  const parseDateStr = (str: string): Date => {
    if (!str || str.length !== 8) return new Date();
    const y = parseInt(str.slice(0, 4), 10);
    const m = parseInt(str.slice(4, 6), 10) - 1;
    const d = parseInt(str.slice(6, 8), 10);
    return new Date(y, m, d);
  };

  const formatDateToStr = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  };

  const currentDateObj = parseDateStr(selectedDate);
  const todayStr = formatDateToStr(new Date());

  // Close calendar popup on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute 7 days centered around selectedDate (3 before, current, 3 after)
  const days: { dateStr: string; dayName: string; dayNum: number; isToday: boolean; isSelected: boolean }[] = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(currentDateObj);
    d.setDate(currentDateObj.getDate() + i);
    const dateStr = formatDateToStr(d);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = d.getDate();
    days.push({
      dateStr,
      dayName,
      dayNum,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate
    });
  }

  const handlePrevWeek = () => {
    const d = new Date(currentDateObj);
    d.setDate(currentDateObj.getDate() - 7);
    onSelectDate(formatDateToStr(d));
  };

  const handleNextWeek = () => {
    const d = new Date(currentDateObj);
    d.setDate(currentDateObj.getDate() + 7);
    onSelectDate(formatDateToStr(d));
  };

  const currentMonthYear = currentDateObj.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="w-full bg-white border border-gray-200/90 rounded-2xl p-3 sm:p-4 mb-4 shadow-xs select-none">
      {/* Top Header: Month/Year on left, Prev/Next Week Arrows on right */}
      <div className="flex items-center justify-between mb-2.5">
        {/* Month / Year button with popup */}
        <div className="relative" ref={datePickerRef}>
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center space-x-1.5 text-sm sm:text-base font-bold text-gray-900 hover:text-orange-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            <span>{currentMonthYear}</span>
            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 ml-1" />
          </button>

          {/* Date Picker Dropdown */}
          {showDatePicker && (
            <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-gray-300 rounded-xl shadow-xl p-4 w-72">
              <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                Select Calendar Date
              </div>
              <input
                type="date"
                value={`${selectedDate.slice(0, 4)}-${selectedDate.slice(4, 6)}-${selectedDate.slice(6, 8)}`}
                onChange={(e) => {
                  if (e.target.value) {
                    const clean = e.target.value.replace(/-/g, '');
                    onSelectDate(clean);
                    setShowDatePicker(false);
                  }
                }}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm text-gray-900 font-bold focus:border-orange-500 outline-none cursor-pointer"
              />
              <div className="flex justify-between mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    onSelectDate(todayStr);
                    setShowDatePicker(false);
                  }}
                  className="text-xs font-bold text-orange-600 hover:underline cursor-pointer"
                >
                  Jump to Today
                </button>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="text-xs font-medium text-gray-500 hover:text-gray-800 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Previous & Next Week Controls (Bigger Icons) */}
        <div className="flex items-center space-x-1 sm:space-x-1.5">
          <button
            onClick={handlePrevWeek}
            title="Previous Week"
            className="p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200/80 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={handleNextWeek}
            title="Next Week"
            className="p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200/80 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* 7 Days Grid: 100% responsive width, 7 symmetrical columns */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 w-full">
        {days.map((day) => (
          <button
            key={day.dateStr}
            onClick={() => onSelectDate(day.dateStr)}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all cursor-pointer ${
              day.isSelected
                ? 'bg-black text-white shadow-xs font-bold'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <span className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider ${
              day.isSelected ? 'text-gray-300' : 'text-gray-500'
            }`}>
              {day.dayName}
            </span>
            <span className="text-sm sm:text-base font-black mt-0.5 leading-tight">
              {day.dayNum}
            </span>
            {day.isToday && !day.isSelected && (
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
