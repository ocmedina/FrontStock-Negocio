"use client";

import { FaPlus, FaTimes } from "react-icons/fa";
import { SaleTab } from "../types";

interface SaleTabsProps {
  tabs: SaleTab[];
  activeTabId: number;
  editingTabId: number | null;
  editingTabName: string;
  onTabClick: (tabId: number) => void;
  onTabDoubleClick: (tabId: number, name: string) => void;
  onNewTab: () => void;
  onCloseTab: (tabId: number) => void;
  onSaveTabName: (tabId: number) => void;
  onCancelEditingTab: () => void;
  setEditingTabName: (name: string) => void;
}

export default function SaleTabs({
  tabs,
  activeTabId,
  editingTabId,
  editingTabName,
  onTabClick,
  onTabDoubleClick,
  onNewTab,
  onCloseTab,
  onSaveTabName,
  onCancelEditingTab,
  setEditingTabName,
}: SaleTabsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`
            group relative flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-all duration-200 border
            ${
              tab.id === activeTabId
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200 hover:text-gray-700"
            }
          `}
          onClick={() => onTabClick(tab.id)}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onTabDoubleClick(tab.id, tab.name);
          }}
        >
          {editingTabId === tab.id ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editingTabName}
                onChange={(e) => setEditingTabName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onSaveTabName(tab.id);
                  } else if (e.key === "Escape") {
                    onCancelEditingTab();
                  }
                }}
                onBlur={() => onSaveTabName(tab.id)}
                autoFocus
                className="w-32 px-2 py-0.5 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ) : (
            <>
              <span className="font-semibold text-sm whitespace-nowrap">
                {tab.name}
              </span>
              {tab.cart.length > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${
                    tab.id === activeTabId
                      ? "bg-blue-600 text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {tab.cart.length}
                </span>
              )}
            </>
          )}

          {tabs.length > 1 && editingTabId !== tab.id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              className={`
                ml-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all
                ${
                  tab.id === activeTabId
                    ? "hover:bg-blue-100 text-blue-400 hover:text-blue-600"
                    : "hover:bg-gray-300 text-gray-400 hover:text-gray-600"
                }
              `}
            >
              <FaTimes size={10} />
            </button>
          )}
        </div>
      ))}

      <button
        onClick={onNewTab}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all border border-gray-200 dark:border-slate-700 ml-1"
        title="Nueva venta (F9)"
      >
        <FaPlus size={12} />
      </button>
    </div>
  );
}
