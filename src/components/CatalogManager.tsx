import React, { useState } from 'react';
import { 
  Database, 
  Plus, 
  Trash2, 
  Search, 
  CheckCircle2, 
  Flame, 
  Zap, 
  ShieldCheck, 
  Clock, 
  RefreshCw,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { CatalogItem } from '../types';

interface CatalogManagerProps {
  items: CatalogItem[];
  onAddItem: (item: Partial<CatalogItem>) => Promise<void>;
  onDeleteItem: (id: number) => Promise<void>;
  onPurgeCache: () => void;
  isLoading: boolean;
}

export const CatalogManager: React.FC<CatalogManagerProps> = ({
  items,
  onAddItem,
  onDeleteItem,
  onPurgeCache,
  isLoading,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Compute');
  const [price, setPrice] = useState('799.00');
  const [stock, setStock] = useState('25');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    await onAddItem({
      name,
      description,
      category,
      price: parseFloat(price) || 100,
      stock: parseInt(stock, 10) || 10,
      sku: `FUS-${category.substring(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 89)}`,
    });
    setIsSubmitting(false);
    setIsModalOpen(false);
    setName('');
    setDescription('');
  };

  const categories = ['all', 'Compute', 'Storage', 'Networking', 'Security', 'Monitoring'];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-md border border-cyan-800/60">
                Items Catalog Domain Service
              </span>
              <span className="text-xs text-slate-400 font-mono">Postgres 16 + Redis Read-Through Cache</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Interactive Hardware &amp; Inventory Management
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              All write operations invalidate the Redis LRU cache and persist directly to PostgreSQL via PgBouncer.
              Reads are served from Redis in &lt;1ms.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-purge-cache"
              onClick={onPurgeCache}
              className="px-3.5 py-2 bg-slate-950 border border-slate-800 hover:border-amber-700 text-amber-400 rounded-xl text-xs font-medium flex items-center transition"
              title="Invalidate Redis cache to observe database query spike on Grafana"
            >
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              Purge Redis Cache
            </button>
            <button
              id="btn-add-item-modal"
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center transition shadow-md shadow-cyan-600/20"
            >
              <Plus className="h-4 w-4 mr-1" />
              Create Item
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items by name or SKU..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium capitalize whitespace-nowrap transition ${
                categoryFilter === cat
                  ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                <th className="py-3 px-4 font-semibold">ITEM DETAILS</th>
                <th className="py-3 px-4 font-semibold">CATEGORY</th>
                <th className="py-3 px-4 font-semibold">CACHE TIER</th>
                <th className="py-3 px-4 font-semibold">DB LATENCY</th>
                <th className="py-3 px-4 font-semibold">PRICE</th>
                <th className="py-3 px-4 font-semibold">STOCK</th>
                <th className="py-3 px-4 font-semibold">CORRELATION ID</th>
                <th className="py-3 px-4 font-semibold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-850/50 transition">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-100 font-sans text-sm">{item.name}</div>
                    <div className="text-[11px] text-slate-400 font-sans mt-0.5 truncate max-w-xs">
                      {item.description}
                    </div>
                    <div className="text-[10px] text-cyan-400 font-mono mt-0.5">SKU: {item.sku}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-sans">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {item.cached ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                        <Zap className="h-3 w-3 mr-1" />
                        REDIS HIT (0.8ms)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-400 border border-amber-800">
                        <Database className="h-3 w-3 mr-1" />
                        POSTGRES READ
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {item.dbLatencyMs} ms
                  </td>
                  <td className="py-3 px-4 font-bold text-white">
                    ${item.price.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-bold ${item.stock < 20 ? 'text-amber-400' : 'text-slate-300'}`}>
                      {item.stock} units
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-500 text-[10px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                      {item.correlationId}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                      title="Delete Item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center">
                <Plus className="h-5 w-5 mr-2 text-cyan-400" />
                Add Catalog Item
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Apex Fiber Switch 48-Port"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter technical specifications..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                  >
                    <option value="Compute">Compute</option>
                    <option value="Storage">Storage</option>
                    <option value="Networking">Networking</option>
                    <option value="Security">Security</option>
                    <option value="Monitoring">Monitoring</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Price ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Inventory Stock</label>
                <input
                  type="number"
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium"
                >
                  {isSubmitting ? 'Persisting...' : 'Save & Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
