"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Folder, File, ChevronRight, ChevronDown, Trash2 } from 'lucide-react';
import { get, set } from 'idb-keyval';

type Item = {
  id: string;
  name: string;
  type: 'folder' | 'document';
  content?: string;
  children?: Item[];
  parentId?: string | null;
};

export default function Dashboard() {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    const storedItems = await get('app-items');
    if (storedItems) {
      setItems(storedItems);
    }
  };

  const saveItems = useCallback(async (newItems: Item[]) => {
    await set('app-items', newItems);
    setItems(newItems);
  }, []);

  const handleCreateFolder = () => {
    const folderName = prompt('Enter folder name:');
    if (folderName) {
      const newFolder: Item = {
        id: Date.now().toString(),
        name: folderName,
        type: 'folder',
        children: [],
        parentId: selectedItem?.type === 'folder' ? selectedItem.id : null,
      };
      const updatedItems = addItemToStructure(items, newFolder);
      saveItems(updatedItems);
    }
  };

  const handleCreateDocument = () => {
    const documentName = prompt('Enter document name:');
    if (documentName) {
      const newDocument: Item = {
        id: Date.now().toString(),
        name: documentName,
        type: 'document',
        content: '',
        parentId: selectedItem?.type === 'folder' ? selectedItem.id : null,
      };
      const updatedItems = addItemToStructure(items, newDocument);
      saveItems(updatedItems);
    }
  };

  const addItemToStructure = (items: Item[], newItem: Item): Item[] => {
    if (!newItem.parentId) {
      return [...items, newItem];
    }

    return items.map(item => {
      if (item.id === newItem.parentId) {
        return {
          ...item,
          children: [...(item.children || []), newItem],
        };
      }
      if (item.children) {
        return {
          ...item,
          children: addItemToStructure(item.children, newItem),
        };
      }
      return item;
    });
  };

  const handleItemClick = (item: Item) => {
    if (item.type === 'folder') {
      setExpandedFolders(prev => {
        const newSet = new Set(prev);
        if (newSet.has(item.id)) {
          newSet.delete(item.id);
        } else {
          newSet.add(item.id);
        }
        return newSet;
      });
    }
    setSelectedItem(item);
  };

  const handleContentChange = (content: string) => {
    if (selectedItem && selectedItem.type === 'document') {
      const updatedItems = updateItemContent(items, selectedItem.id, content);
      setItems(updatedItems);
      setSelectedItem({ ...selectedItem, content });
    }
  };

  const updateItemContent = (items: Item[], id: string, content: string): Item[] => {
    return items.map(item => {
      if (item.id === id) {
        return { ...item, content };
      }
      if (item.children) {
        return { ...item, children: updateItemContent(item.children, id, content) };
      }
      return item;
    });
  };

  const handleDeleteItem = (itemToDelete: Item) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete ${itemToDelete.name}?`);
    if (confirmDelete) {
      const updatedItems = deleteItemFromStructure(items, itemToDelete.id);
      saveItems(updatedItems);
      if (selectedItem && selectedItem.id === itemToDelete.id) {
        setSelectedItem(null);
      }
    }
  };

  const deleteItemFromStructure = (items: Item[], idToDelete: string): Item[] => {
    return items.filter(item => item.id !== idToDelete).map(item => {
      if (item.children) {
        return { ...item, children: deleteItemFromStructure(item.children, idToDelete) };
      }
      return item;
    });
  };

  useEffect(() => {
    const autosaveInterval = setInterval(() => {
      if (selectedItem && selectedItem.type === 'document') {
        saveItems(items);
      }
    }, 3000);

    return () => clearInterval(autosaveInterval);
  }, [selectedItem, items, saveItems]);

  const renderItems = (items: Item[], depth = 0) => {
    return items.map(item => (
      <div key={item.id} style={{ marginLeft: `${depth * 20}px` }}>
        <div
          className={`flex items-center cursor-pointer hover:bg-accent hover:text-accent-foreground py-1 ${
            selectedItem?.id === item.id ? 'bg-accent text-accent-foreground' : ''
          }`}
        >
          <div className="flex-grow flex items-center" onClick={() => handleItemClick(item)}>
            {item.type === 'folder' && (
              expandedFolders.has(item.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />
            )}
            {item.type === 'folder' ? <Folder size={16} /> : <File size={16} />}
            <span className="ml-2">{item.name}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteItem(item);
            }}
          >
            <Trash2 size={16} />
          </Button>
        </div>
        {item.type === 'folder' && expandedFolders.has(item.id) && item.children && (
          <div>{renderItems(item.children, depth + 1)}</div>
        )}
      </div>
    ));
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="w-64 border-r border-border p-4">
        <div className="space-y-2 mb-4">
          <Button onClick={handleCreateFolder} className="w-full">New Folder</Button>
          <Button onClick={handleCreateDocument} className="w-full">New Document</Button>
        </div>
        <ScrollArea className="h-[calc(100vh-120px)]">
          {renderItems(items)}
        </ScrollArea>
      </div>
      <div className="flex-1 p-4">
        {selectedItem && selectedItem.type === 'document' && (
          <div className="h-full flex flex-col">
            <Input
              value={selectedItem.name}
              onChange={(e) => {
                const updatedItems = updateItemContent(items, selectedItem.id, selectedItem.content || '');
                const updatedItem = { ...selectedItem, name: e.target.value };
                setSelectedItem(updatedItem);
                setItems(updatedItems.map(item => item.id === selectedItem.id ? updatedItem : item));
              }}
              className="mb-4"
            />
            <div className="flex-1 flex">
              <Textarea
                value={selectedItem.content}
                onChange={(e) => handleContentChange(e.target.value)}
                className="flex-1 mr-2 font-mono"
              />
              <div className="flex-1 ml-2 border border-border rounded-md p-4 overflow-auto">
                {selectedItem.content || ''}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}