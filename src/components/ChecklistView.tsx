import React, { useState } from 'react';
import { PackingItem, PassItem } from '../types';

interface ChecklistViewProps {
  packingItems: PackingItem[];
  setPackingItems: React.Dispatch<React.SetStateAction<PackingItem[]>>;
  packingCategories: string[];
  setPackingCategories: React.Dispatch<React.SetStateAction<string[]>>;
  passesItems: PassItem[];
  setPassesItems: React.Dispatch<React.SetStateAction<PassItem[]>>;
  onOpenAlexaModal: () => void;
  syncStatusText: string;
  syncActionText: string | null;
  onSyncAction: () => void;
  onSyncItemChange: (op: any) => void;
}

export const ChecklistView: React.FC<ChecklistViewProps> = ({
  packingItems,
  setPackingItems,
  packingCategories,
  setPackingCategories,
  passesItems,
  setPassesItems,
  onOpenAlexaModal,
  syncStatusText,
  syncActionText,
  onSyncAction,
  onSyncItemChange,
}) => {
  const [mobileTab, setMobileTab] = useState<'packing' | 'passes'>('packing');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [newItemCategory, setNewItemCategory] = useState(packingCategories[0] || 'Essentials');
  const [newCategoryName, setNewCategoryName] = useState('');

  const totalPacking = packingItems.length;
  const checkedPacking = packingItems.filter(i => i.checked).length;
  const packingPct = totalPacking === 0 ? 0 : Math.round((checkedPacking / totalPacking) * 100);

  const totalPasses = passesItems.length;
  const checkedPasses = passesItems.filter(i => i.checked).length;

  const handleTogglePacking = (id: string) => {
    setPackingItems(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      );
      localStorage.setItem('dc_packing_items_v12', JSON.stringify(updated));
      const tItem = updated.find(i => i.id === id);
      if (tItem) {
        onSyncItemChange({
          list: 'packing',
          op: 'upsert',
          item: { id, name: tItem.name, checked: tItem.checked },
        });
      }
      return updated;
    });
  };

  const handleDeletePacking = (id: string) => {
    setPackingItems(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem('dc_packing_items_v12', JSON.stringify(updated));
      onSyncItemChange({ list: 'packing', op: 'delete', item: { id } });
      return updated;
    });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    const cat = newItemCategory || packingCategories[0] || 'Essentials';
    const newItem: PackingItem = {
      id: 'user_' + Date.now(),
      name: newItemText.trim(),
      category: cat,
      checked: false,
    };
    setPackingItems(prev => {
      const updated = [...prev, newItem];
      localStorage.setItem('dc_packing_items_v12', JSON.stringify(updated));
      onSyncItemChange({ list: 'packing', op: 'upsert', item: newItem });
      return updated;
    });
    setNewItemText('');
  };

  const handleAddCategory = () => {
    const val = newCategoryName.trim();
    if (!val) return;
    if (packingCategories.some(c => c.toLowerCase() === val.toLowerCase())) {
      alert('This category already exists!');
      return;
    }
    const updated = [...packingCategories, val];
    setPackingCategories(updated);
    localStorage.setItem('dc_categories_v12', JSON.stringify(updated));
    setNewCategoryName('');
  };

  const handleRenameCategory = (oldName: string) => {
    const newName = prompt(`Rename "${oldName}" to:`, oldName);
    if (!newName || newName.trim() === '' || newName.trim() === oldName) return;
    const cleanName = newName.trim();
    if (
      packingCategories.some(
        c => c.toLowerCase() === cleanName.toLowerCase() && c !== oldName
      )
    ) {
      alert('Category already exists!');
      return;
    }
    const updatedCats = packingCategories.map(c => (c === oldName ? cleanName : c));
    setPackingCategories(updatedCats);
    localStorage.setItem('dc_categories_v12', JSON.stringify(updatedCats));

    setPackingItems(prev => {
      const updatedItems = prev.map(item =>
        item.category === oldName ? { ...item, category: cleanName } : item
      );
      localStorage.setItem('dc_packing_items_v12', JSON.stringify(updatedItems));
      onSyncItemChange({ list: 'packing', op: 'renameCategory', from: oldName, to: cleanName });
      return updatedItems;
    });
  };

  const handleChangeItemCategory = (itemId: string) => {
    const item = packingItems.find(i => i.id === itemId);
    if (!item) return;
    const newCat = prompt(
      `Move "${item.name}" to which category?\nAvailable: ${packingCategories.join(', ')}`,
      item.category
    );
    if (!newCat) return;
    const matchedCat = packingCategories.find(
      c => c.toLowerCase() === newCat.trim().toLowerCase()
    );
    if (!matchedCat) {
      alert(`Category "${newCat}" does not exist.`);
      return;
    }
    setPackingItems(prev => {
      const updated = prev.map(i => (i.id === itemId ? { ...i, category: matchedCat } : i));
      localStorage.setItem('dc_packing_items_v12', JSON.stringify(updated));
      onSyncItemChange({
        list: 'packing',
        op: 'upsert',
        item: { id: itemId, name: item.name, category: matchedCat },
      });
      return updated;
    });
  };

  const handleRemoveCategory = (catToRemove: string) => {
    if (packingCategories.length <= 1) {
      alert('Must keep at least one category.');
      return;
    }
    const affectedItems = packingItems.filter(i => i.category === catToRemove);
    if (affectedItems.length > 0) {
      const fallbackCat = packingCategories.find(c => c !== catToRemove) || 'Essentials';
      const ok = confirm(
        `Move ${affectedItems.length} item(s) to "${fallbackCat}" and delete "${catToRemove}"?`
      );
      if (!ok) return;
      setPackingItems(prev => {
        const updated = prev.map(item =>
          item.category === catToRemove ? { ...item, category: fallbackCat } : item
        );
        localStorage.setItem('dc_packing_items_v12', JSON.stringify(updated));
        affectedItems.forEach(it =>
          onSyncItemChange({
            list: 'packing',
            op: 'upsert',
            item: { id: it.id, name: it.name, category: fallbackCat },
          })
        );
        return updated;
      });
    }
    const updatedCats = packingCategories.filter(c => c !== catToRemove);
    setPackingCategories(updatedCats);
    localStorage.setItem('dc_categories_v12', JSON.stringify(updatedCats));
  };

  const handleTogglePass = (id: string) => {
    setPassesItems(prev => {
      const updated = prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      );
      localStorage.setItem('dc_passes_items_v12', JSON.stringify(updated));
      const pItem = updated.find(i => i.id === id);
      if (pItem) {
        onSyncItemChange({ list: 'passes', op: 'upsert', item: { id, checked: pItem.checked } });
      }
      return updated;
    });
  };

  return (
    <div className="space-y-4">
      {/* Mobile Tab Selector */}
      <div className="lg:hidden flex bg-slate-200/90 p-1 rounded-xl mb-4 text-xs font-bold max-w-md mx-auto">
        <button
          onClick={() => setMobileTab('packing')}
          className={`flex-1 py-2 rounded-lg transition cursor-pointer ${
            mobileTab === 'packing' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          <i className="fa-solid fa-suitcase mr-1"></i>Packing ({checkedPacking}/{totalPacking})
        </button>
        <button
          onClick={() => setMobileTab('passes')}
          className={`flex-1 py-2 rounded-lg transition cursor-pointer ${
            mobileTab === 'passes' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          <i className="fa-solid fa-ticket mr-1"></i>Passes ({checkedPasses}/{totalPasses})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* COLUMN 1: PACKING CHECKLIST */}
        <div className={`space-y-4 ${mobileTab === 'passes' ? 'hidden lg:block' : ''}`}>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="serif text-sm font-black uppercase tracking-wider text-slate-900">
                  Packing List
                </h3>
                <p className="text-xs text-slate-500">Add, rename, and manage custom categories</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-indigo-600">{packingPct}%</span>
                <button
                  onClick={() => setShowCategoryManager(!showCategoryManager)}
                  className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 border border-slate-200 shadow-2xs cursor-pointer"
                >
                  <i className="fa-solid fa-gear text-slate-500 text-[11px]"></i>
                  <span>Manage Categories</span>
                </button>
              </div>
            </div>

            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-[color:var(--navy)] transition-all duration-300"
                style={{ width: `${packingPct}%` }}
              ></div>
            </div>

            <button
              type="button"
              onClick={onOpenAlexaModal}
              className="w-full mb-4 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <i className="fa-solid fa-microphone"></i> Send to Alexa (voice commands)
            </button>

            <form onSubmit={handleAddItem} className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Add item (e.g. Camera, Nintendo)..."
                  value={newItemText}
                  onChange={e => setNewItemText(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />

                <div className="flex gap-2">
                  <select
                    value={newItemCategory}
                    onChange={e => setNewItemCategory(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {packingCategories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition whitespace-nowrap cursor-pointer"
                  >
                    <i className="fa-solid fa-plus mr-1"></i> Add Item
                  </button>
                </div>
              </div>
            </form>

            {/* Category Manager Panel */}
            {showCategoryManager && (
              <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/70 p-4 rounded-xl border">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                    <i className="fa-solid fa-pen-to-square text-indigo-600"></i> Category Manager
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Click ✏️ to rename or ✕ to remove
                  </span>
                </div>

                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="New category name..."
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    + Add Category
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {packingCategories.map(cat => (
                    <div
                      key={cat}
                      className="inline-flex items-center gap-1.5 bg-white border border-slate-300 text-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs"
                    >
                      <span>{cat}</span>
                      <button
                        type="button"
                        onClick={() => handleRenameCategory(cat)}
                        title="Rename"
                        className="text-indigo-600 hover:text-indigo-800 p-0.5 ml-1 cursor-pointer"
                      >
                        <i className="fa-solid fa-pencil text-[11px]"></i>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveCategory(cat)}
                        title="Delete"
                        className="text-slate-400 hover:text-rose-500 p-0.5 ml-0.5 cursor-pointer"
                      >
                        <i className="fa-solid fa-trash-can text-[11px]"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sync Status Banner */}
          <div className="sync-status text-[11px] text-slate-500 flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
            <span dangerouslySetInnerHTML={{ __html: syncStatusText }}></span>
            {syncActionText && (
              <button
                onClick={onSyncAction}
                className="shrink-0 font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                {syncActionText}
              </button>
            )}
          </div>

          {/* Packing Items grouped by category */}
          <div className="space-y-4">
            {packingCategories.map(cat => {
              const catItems = packingItems.filter(i => i.category === cat);
              return (
                <div
                  key={cat}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <i className="fa-solid fa-folder-open text-indigo-500 text-[11px]"></i>
                      <span>{cat}</span>
                    </h4>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                        {catItems.filter(i => i.checked).length}/{catItems.length}
                      </span>
                      <button
                        onClick={() => handleRenameCategory(cat)}
                        className="text-slate-400 hover:text-indigo-600 p-1 cursor-pointer"
                        title="Rename category"
                      >
                        <i className="fa-solid fa-pencil text-[10px]"></i>
                      </button>
                    </div>
                  </div>

                  {catItems.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-1">No items in this category.</p>
                  ) : (
                    <div className="space-y-2">
                      {catItems.map(item => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs py-1 hover:bg-slate-50 px-2 rounded-lg transition group"
                        >
                          <label className="flex items-center gap-2.5 flex-1 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={() => handleTogglePacking(item.id)}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                            />
                            <span
                              className={
                                item.checked
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-800 font-medium'
                              }
                            >
                              {item.name}
                            </span>
                          </label>
                          <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                            <button
                              onClick={() => handleChangeItemCategory(item.id)}
                              title="Move category"
                              className="text-slate-400 hover:text-indigo-600 p-1 cursor-pointer"
                            >
                              <i className="fa-solid fa-arrow-right-arrow-left text-[10px]"></i>
                            </button>
                            <button
                              onClick={() => handleDeletePacking(item.id)}
                              title="Delete item"
                              className="text-slate-300 hover:text-rose-500 p-1 cursor-pointer"
                            >
                              <i className="fa-solid fa-trash-can text-xs"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: PASSES & REGISTRATIONS */}
        <div className={`space-y-4 ${mobileTab === 'packing' ? 'hidden lg:block' : ''}`}>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3 shadow-xs">
            <i className="fa-solid fa-shield-halved text-amber-700 text-lg mt-0.5"></i>
            <div>
              <p className="font-bold text-sm">Official ID &amp; Security Protocol</p>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Physical REAL IDs or Passports required for all adults at White House, Pentagon, and
                U.S. Capitol tours. Strictly no backpacks at the White House.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="serif text-sm font-black uppercase tracking-wider text-slate-900">
                  Reservations &amp; Timed Passes
                </h3>
                <p className="text-xs text-slate-500">
                  Government tours &amp; confirmed restaurant tables
                </p>
              </div>
              <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                {checkedPasses} of {totalPasses} Verified
              </span>
            </div>

            <div className="sync-status text-[11px] text-slate-500 flex items-center justify-between gap-2 bg-slate-50 mb-3 border border-slate-200 rounded-xl px-3 py-2">
              <span dangerouslySetInnerHTML={{ __html: syncStatusText }}></span>
              {syncActionText && (
                <button
                  onClick={onSyncAction}
                  className="shrink-0 font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  {syncActionText}
                </button>
              )}
            </div>

            <div className="space-y-3">
              {passesItems.map(item => (
                <div
                  key={item.id}
                  className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200 shadow-xs flex items-start justify-between gap-3 hover:bg-slate-50 transition"
                >
                  <div className="flex-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono">
                      {item.time}
                    </span>
                    <h4 className="text-xs font-black text-slate-900 mt-1">{item.title}</h4>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5 font-medium">
                      {item.conf}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => handleTogglePass(item.id)}
                    className="w-5 h-5 mt-1 rounded border-slate-300 text-emerald-600 focus:ring-0 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
