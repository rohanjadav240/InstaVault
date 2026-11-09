import React from 'react';
import {
  FolderHeart,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  Search,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { db } from '../db/database';
import type { Collection, ContentItem } from '../types';

export function CollectionsPage() {
  const [collections, setCollections] = React.useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = React.useState<Collection | null>(null);
  const [collectionItems, setCollectionItems] = React.useState<ContentItem[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadCollections() {
      try {
        setIsLoading(true);
        const latestBackup = await db.backups.orderBy('id').last();
        if (!latestBackup || !latestBackup.id) {
          setIsLoading(false);
          return;
        }

        const cols = await db.collections
          .where('backupId')
          .equals(latestBackup.id)
          .toArray();

        setCollections(cols);
      } catch (err) {
        console.error('Failed to load collections:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCollections();
  }, []);

  const handleSelectCollection = async (col: Collection) => {
    setSelectedCollection(col);
    if (!col.id) return;

    try {
      const rels = await db.collectionItems.where('collectionId').equals(col.id).toArray();
      const contentIds = rels.map((r) => r.contentItemId);
      let items = await db.contentItems.where('id').anyOf(contentIds).toArray();
      
      // Also fallback: if relationship table has fewer items or is empty, lookup by collectionName
      if (col.name) {
        const byName = await db.contentItems.where('collectionName').equals(col.name).toArray();
        if (byName.length > items.length) {
          items = byName;
        }
      }
      setCollectionItems(items);
    } catch (err) {
      console.error('Failed to load collection items:', err);
    }
  };

  const filteredCollections = collections.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FolderHeart className="w-6 h-6 text-rose-400" />
            <span>Collections</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Organized folders from your Instagram saved media ({collections.length} collections)
          </p>
        </div>

        {selectedCollection ? (
          <Button
            onClick={() => setSelectedCollection(null)}
            variant="secondary"
            size="sm"
            className="gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to All Collections</span>
          </Button>
        ) : (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search collections..."
              className="w-full h-9 pl-9 pr-4 rounded-lg bg-[#14141e] border border-[#262638] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>
        )}
      </div>

      {/* Selected Collection View */}
      {selectedCollection ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/30 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">{selectedCollection.name}</h2>
              <p className="text-xs text-rose-300">
                {collectionItems.length} items in this collection
              </p>
            </div>
          </div>

          {collectionItems.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">
              No content items directly mapped for this collection.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {collectionItems.map((item, i) => (
                <Card key={i} className="p-4 border-[#232334] bg-[#13131e] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-violet-300">
                      @{item.creatorUsername || 'unknown'}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#1c1c2b] text-slate-400">
                      {item.contentType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-3">
                    {item.caption || item.originalUrl}
                  </p>
                  <a
                    href={item.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="secondary" size="sm" className="w-full gap-1.5 text-xs">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Link</span>
                    </Button>
                  </a>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Collections Grid */
        <div>
          {!isLoading && filteredCollections.length === 0 ? (
            <EmptyState
              title="No Collections Found"
              description="No Instagram collections were found in this export."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCollections.map((col, idx) => (
                <Card
                  key={col.id || idx}
                  hoverEffect
                  onClick={() => handleSelectCollection(col)}
                  className="p-5 border-[#232334] bg-[#13131e] cursor-pointer space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-rose-950/40 border border-rose-800/40 flex items-center justify-center text-rose-300">
                      <FolderHeart className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-base truncate">{col.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {col.itemCount} saved {col.itemCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-rose-300 font-medium pt-2 border-t border-[#20202e]">
                    <span>View Collection</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

