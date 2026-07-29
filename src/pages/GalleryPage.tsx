import React, { useState } from 'react';
import { getStoredGallery } from '../lib/storage';
import { GalleryItem } from '../types';
import { Image, Maximize2, X, Filter } from 'lucide-react';

export const GalleryPage: React.FC = () => {
  const gallery = getStoredGallery();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeLightbox, setActiveLightbox] = useState<GalleryItem | null>(null);

  const categories = ['All', 'Equipment', 'Cardio', 'CrossFit', 'Transformations', 'Classes'];

  const filteredItems =
    activeCategory === 'All'
      ? gallery
      : gallery.filter((item) => item.category === activeCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 text-zinc-100">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="text-xs font-bold text-blue-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
          <Image className="w-4 h-4" />
          Inside AB Gym
        </span>
        <h1 className="text-4xl sm:text-5xl font-black text-white font-mono uppercase tracking-tight">
          GYM <span className="text-blue-500">GALLERY</span>
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Take a virtual tour of our 20,000 sq. ft. high-performance training floor, heavy powerlifting equipment, cardio arenas, and inspiring member transformations.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeCategory === cat
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => setActiveLightbox(item)}
            className="group relative h-72 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer shadow-xl"
          >
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

            <div className="absolute bottom-4 left-4 right-4 space-y-1">
              <span className="px-2.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wider">
                {item.category}
              </span>
              <h3 className="text-base font-black text-white font-mono">{item.title}</h3>
              {item.description && (
                <p className="text-xs text-zinc-300 line-clamp-2">{item.description}</p>
              )}
            </div>

            <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {activeLightbox && (
        <div
          onClick={() => setActiveLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
          >
            <button
              onClick={() => setActiveLightbox(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/70 text-white hover:bg-blue-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <img
              src={activeLightbox.imageUrl}
              alt={activeLightbox.title}
              className="w-full max-h-[70vh] object-cover"
            />

            <div className="p-6 space-y-2 bg-zinc-900">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-blue-600 text-white text-xs font-bold uppercase">
                  {activeLightbox.category}
                </span>
                <h3 className="text-xl font-black text-white font-mono">{activeLightbox.title}</h3>
              </div>
              {activeLightbox.description && (
                <p className="text-xs text-zinc-300 leading-relaxed">{activeLightbox.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
