"use client";

import React from "react";

interface Slot {
  id: string;
  date: string;
  time: string;
  doctorName?: string;
  available: boolean;
}

interface AppointmentSlotProps {
  slots: Slot[];
  onSelect: (slot: Slot) => void;
  selectedSlot?: Slot | null;
}

export function AppointmentSlot({ slots, onSelect, selectedSlot }: AppointmentSlotProps) {
  const groupedByDate = slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    const date = slot.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {});

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

    return date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div className="space-y-4">
      {Object.entries(groupedByDate).map(([date, dateSlots]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            {formatDate(date)}
          </h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {dateSlots.map((slot) => {
              const isSelected = selectedSlot?.id === slot.id;
              const isDisabled = !slot.available;

              return (
                <button
                  key={slot.id}
                  onClick={() => !isDisabled && onSelect(slot)}
                  disabled={isDisabled}
                  aria-pressed={isSelected}
                  aria-label={`${slot.time} on ${formatDate(date)}${
                    slot.doctorName ? ` with ${slot.doctorName}` : ""
                  }${isDisabled ? " - unavailable" : ""}`}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-all
                    ${
                      isSelected
                        ? "bg-blue-600 text-white ring-2 ring-blue-300"
                        : isDisabled
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                    }
                  `}
                >
                  {slot.time}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {slots.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          No available slots found.
        </div>
      )}
    </div>
  );
}
