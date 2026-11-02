import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeDayRef = useRef<HTMLButtonElement>(null);

  // Parse selected date string into Date object
  const parseDateStr = useCallback((str: string): Date => {
    if (!str || str.length !== 8) return new Date();
    const y = parseInt(str.slice(0, 4), 10);
    const m = parseInt(str.slice(4, 6), 10) - 1;
    const d = parseInt(str.slice(6, 8), 10);
    return new Date(y, m, d);
  }, []);

  const formatDateToStr = useCallback((date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }, []);

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

  // Generate a wide, continuous 29-day swipeable window (14 days past, today, 14 days future)
  const days = React.useMemo(() => {
    const todayObj = new Date();
    const list: {
      dateStr: string;
      dayName: string;
      dayNum: number;
      isToday: boolean;
      isSelected: boolean;
      monthShort: string;
    }[] = [];

    for (let i = -14; i <= 14; i++) {
      const d = new Date(todayObj);
      d.setDate(todayObj.getDate() + i);
      const dateStr = formatDateToStr(d);
      list.push({
        dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate
      });
    }
    return list;
  }, [formatDateToStr, todayStr, selectedDate]);

  // Smoothly center the active date into view whenever selectedDate changes or mounts
  useEffect(() => {
    if (activeDayRef.current && scrollContainerRef.current) {
      activeDayRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }, [selectedDate]);

  // Touch Swipe Gesture Handlers for easy flicking between days
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Detect horizontal swipe if deltaX > 50px and mostly horizontal
    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      const d = new Date(currentDateObj);
      if (deltaX < 0) {
        // Swiped Left -> Next Day
        d.setDate(currentDateObj.getDate() + 1);
        onSelectDate(formatDateToStr(d));
      } else {
        // Swiped Right -> Previous Day
        d.setDate(currentDateObj.getDate() - 1);
        onSelectDate(formatDateToStr(d));
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const handlePrevDay = () => {
    const d = new Date(currentDateObj);
    d.setDate(currentDateObj.getDate() - 1);
    onSelectDate(formatDateToStr(d));
  };

  const handleNextDay = () => {
    const d = new Date(currentDateObj);
    d.setDate(currentDateObj.getDate() + 1);
    onSelectDate(formatDateToStr(d));
  };

  const currentMonthYear = currentDateObj.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div
      className="w-full bg-white border border-gray-200/90 rounded-2xl p-3 sm:p-4 mb-4 shadow-xs select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Header: Month/Year on left, Jump to Today and Day Arrows */}
      <div className="flex items-center justify-between mb-3">
        {/* Month / Year button with date picker popup */}
        <div className="relative" ref={datePickerRef}>
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center space-x-1.5 text-sm sm:text-base font-black text-gray-900 hover:text-orange-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 cursor-pointer"
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

        {/* Quick controls: Jump to Today + Prev/Next Day buttons */}
        <div className="flex items-center space-x-1 sm:space-x-1.5">
          {selectedDate !== todayStr && (
            <button
              onClick={() => onSelectDate(todayStr)}
              className="text-xs font-bold text-black hover:text-orange-600 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer mr-1"
            >
              Today
            </button>
          )}
          <button
            onClick={handlePrevDay}
            title="Previous Day"
            className="p-1.5 sm:p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200/80 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={handleNextDay}
            title="Next Day"
            className="p-1.5 sm:p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200/80 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Swipeable & Scrollable Horizontal Date Carousel */}
      <div
        ref={scrollContainerRef}
        className="flex items-center space-x-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1 -mx-1"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {days.map((day) => {
          const isSelected = day.isSelected;
          return (
            <button
              key={day.dateStr}
              ref={isSelected ? activeDayRef : undefined}
              onClick={() => onSelectDate(day.dateStr)}
              className={`flex flex-col items-center justify-center flex-shrink-0 w-[58px] sm:w-[68px] py-2.5 px-2 rounded-xl transition-all cursor-pointer ${
                isSelected
                  ? 'bg-black text-white shadow-md font-bold scale-102'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 border border-gray-100'
              }`}
            >
              <span
                className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider ${
                  isSelected ? 'text-gray-300' : 'text-gray-500'
                }`}
              >
                {day.dayName}
              </span>
              <span className="text-base sm:text-lg font-black mt-0.5 leading-tight">
                {day.dayNum}
              </span>
              <span
                className={`text-[9px] uppercase font-bold tracking-tight mt-0.5 ${
                  isSelected ? 'text-orange-400' : 'text-gray-400'
                }`}
              >
                {day.monthShort}
              </span>
              {day.isToday && !isSelected && (
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
