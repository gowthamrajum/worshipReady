import React from "react";
import { FiArrowUp, FiArrowDown } from "react-icons/fi";

const SlideSelector = ({
  lyrics = [],
  selectedStanzas = [],
  recurringStanzaId,
  setRecurringStanzaId,
  onReorder,
}) => {
  const selectedItems = lyrics.filter((s) => selectedStanzas.includes(s.id));

  const move = (index, direction) => {
    if (direction === "up" && index > 0) {
      const reordered = [...selectedStanzas];
      [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
      onReorder(reordered);
    }
    if (direction === "down" && index < selectedStanzas.length - 1) {
      const reordered = [...selectedStanzas];
      [reordered[index + 1], reordered[index]] = [reordered[index], reordered[index + 1]];
      onReorder(reordered);
    }
  };

  return (
    <div className="mt-4 border-t pt-4 space-y-2">
      <h4 className="font-semibold text-gray-800">Slide Order & Recurring Theme</h4>
      {selectedItems.map((item, index) => (
        <div key={item.id} className="flex items-center justify-between bg-gray-50 p-2 rounded border">
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="recurring"
              checked={recurringStanzaId === item.id}
              onChange={() => setRecurringStanzaId(item.id)}
              title="Set as recurring"
            />
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => move(index, "up")}
              className="text-gray-500 hover:text-indigo-600"
              title="Move Up"
            >
              <FiArrowUp />
            </button>
            <button
              onClick={() => move(index, "down")}
              className="text-gray-500 hover:text-indigo-600"
              title="Move Down"
            >
              <FiArrowDown />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SlideSelector;