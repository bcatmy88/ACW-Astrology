import React, { useState, useMemo, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Menu, 
  Calendar as CalendarIcon, 
  Image as ImageIcon, 
  Trash2, 
  ChevronRight, 
  ChevronLeft,
  X, 
  UploadCloud, 
  BookOpen,
  Maximize2,
  Globe,
  Check,
  Edit3,
  Sparkles,
  Tag,
  Hash
} from 'lucide-react';
import type { NoteItem, AppLanguage } from '../types';
import LanguageToggle from './LanguageToggle';

interface NotesViewProps {
  notes: NoteItem[];
  onSaveNote: (note: NoteItem) => void;
  onDeleteNote: (noteId: string) => void;
  onOpenMenu: () => void;
  lang?: AppLanguage;
  onToggleLang?: (lang: AppLanguage) => void;
  profileAvatar?: string;
  profileName?: string;
}

const PRESET_KEYWORDS = [
  '八字命理', '数字学', '占星相位', '十二命宫', 
  '风水堪舆', '佛牌法事', '催财起运', '化解小人', 
  '姻缘合婚', '客户问事', '修心随笔'
];

// Image compression helper
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 1200;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function NotesView({
  notes,
  onSaveNote,
  onDeleteNote,
  onOpenMenu,
  lang = 'zh',
  onToggleLang,
  profileAvatar,
  profileName
}: NotesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Editor modal state
  const [isEditing, setIsEditing] = useState(false);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  
  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formContent, setFormContent] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formKeywords, setFormKeywords] = useState<string[]>([]);
  const [customKeywordInput, setCustomKeywordInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Feed interactive states
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  // Full-screen Facebook-style gallery lightbox
  const [lightboxData, setLightboxData] = useState<{ images: string[]; index: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const toggleExpand = (noteId: string) => {
    setExpandedNotes(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
  };

  const openLightbox = (images: string[], index: number) => {
    setLightboxData({ images, index });
  };

  // Collect all unique categories from notes and presets
  const allCategories = useMemo(() => {
    const catSet = new Set<string>();
    notes.forEach(n => {
      (n.keywords || []).forEach(k => {
        if (k.trim()) catSet.add(k.trim());
      });
    });
    PRESET_KEYWORDS.forEach(k => catSet.add(k));
    return Array.from(catSet);
  }, [notes]);

  // Filtered notes by search query and category
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      // Category filter
      if (selectedCategory) {
        if (!(n.keywords || []).includes(selectedCategory)) {
          return false;
        }
      }
      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchContent = n.content.toLowerCase().includes(q);
      const matchKeywords = (n.keywords || []).some(k => k.toLowerCase().includes(q));
      return matchTitle || matchContent || matchKeywords;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.updatedAt - a.updatedAt);
  }, [notes, searchQuery, selectedCategory]);

  const handleOpenNewNote = () => {
    setSelectedNote(null);
    setFormTitle('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormContent('');
    setFormImages([]);
    setFormKeywords(selectedCategory ? [selectedCategory] : ['八字命理']);
    setCustomKeywordInput('');
    setIsEditing(true);
  };

  const handleOpenNote = (note: NoteItem) => {
    setSelectedNote(note);
    setFormTitle(note.title);
    setFormDate(note.date);
    setFormContent(note.content);
    setFormImages(note.images || []);
    setFormKeywords(note.keywords || []);
    setCustomKeywordInput('');
    setIsEditing(true);
  };

  const handleAddCustomKeyword = () => {
    const trimmed = customKeywordInput.trim().replace(/^#+/, '');
    if (!trimmed) return;
    if (!formKeywords.includes(trimmed)) {
      setFormKeywords(prev => [...prev, trimmed]);
    }
    setCustomKeywordInput('');
  };

  const handleToggleFormKeyword = (kw: string) => {
    if (formKeywords.includes(kw)) {
      setFormKeywords(prev => prev.filter(k => k !== kw));
    } else {
      setFormKeywords(prev => [...prev, kw]);
    }
  };

  const handleRemoveFormKeyword = (kw: string) => {
    setFormKeywords(prev => prev.filter(k => k !== kw));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i]);
        newImages.push(compressed);
      }
      setFormImages(prev => [...prev, ...newImages]);
    } catch (err) {
      console.error("Image upload failed", err);
      alert(lang === 'zh' ? "图片上传失败" : "Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const resolvedTitle = formTitle.trim() || (lang === 'zh' ? '随手心得' : 'Note');
    if (!formContent.trim() && formImages.length === 0) {
      alert(lang === 'zh' ? "请填写笔记内容或上传图片" : "Please enter content or upload photos");
      return;
    }

    const now = Date.now();
    const noteToSave: NoteItem = {
      id: selectedNote ? selectedNote.id : crypto.randomUUID(),
      title: resolvedTitle,
      date: formDate || new Date().toISOString().split('T')[0],
      content: formContent,
      images: formImages,
      keywords: formKeywords,
      createdAt: selectedNote ? selectedNote.createdAt : now,
      updatedAt: now
    };

    onSaveNote(noteToSave);
    setIsEditing(false);
    setSelectedNote(null);
  };

  const handleDelete = (id: string) => {
    if (confirm(lang === 'zh' ? "确认删除这条笔记吗？" : "Delete this note?")) {
      onDeleteNote(id);
      setIsEditing(false);
      setSelectedNote(null);
    }
  };

  // Facebook-style multi-image layout renderer
  const renderFacebookImages = (images: string[]) => {
    if (!images || images.length === 0) return null;

    if (images.length === 1) {
      return (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            openLightbox(images, 0);
          }}
          className="relative w-full max-h-[420px] rounded-xl overflow-hidden border border-zinc-800/80 bg-zinc-950 cursor-pointer group/img shadow-inner"
        >
          <img 
            src={images[0]} 
            alt="Post media" 
            className="w-full h-full max-h-[420px] object-cover sm:object-contain bg-zinc-950 transition-transform duration-300 group-hover/img:scale-[1.01]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <Maximize2 className="w-5 h-5 text-white drop-shadow-md" />
          </div>
        </div>
      );
    }

    if (images.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-1.5 h-60 sm:h-72 rounded-xl overflow-hidden border border-zinc-800/80">
          {images.map((img, idx) => (
            <div 
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                openLightbox(images, idx);
              }}
              className="relative h-full bg-zinc-950 cursor-pointer group/img overflow-hidden"
            >
              <img 
                src={img} 
                alt={`Media ${idx + 1}`} 
                className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-[1.02]" 
                loading="lazy" 
              />
            </div>
          ))}
        </div>
      );
    }

    if (images.length === 3) {
      return (
        <div className="grid grid-cols-2 gap-1.5 h-64 sm:h-80 rounded-xl overflow-hidden border border-zinc-800/80">
          <div 
            onClick={(e) => {
              e.stopPropagation();
              openLightbox(images, 0);
            }}
            className="relative h-full bg-zinc-950 cursor-pointer group/img overflow-hidden"
          >
            <img 
              src={images[0]} 
              alt="Media 1" 
              className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-[1.02]" 
              loading="lazy" 
            />
          </div>
          <div className="grid grid-rows-2 gap-1.5 h-full">
            {images.slice(1, 3).map((img, idx) => (
              <div 
                key={idx + 1}
                onClick={(e) => {
                  e.stopPropagation();
                  openLightbox(images, idx + 1);
                }}
                className="relative h-full bg-zinc-950 cursor-pointer group/img overflow-hidden"
              >
                <img 
                  src={img} 
                  alt={`Media ${idx + 2}`} 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-[1.02]" 
                  loading="lazy" 
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 4 or more images
    return (
      <div className="grid grid-cols-2 gap-1.5 h-64 sm:h-80 rounded-xl overflow-hidden border border-zinc-800/80">
        {images.slice(0, 3).map((img, idx) => (
          <div 
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              openLightbox(images, idx);
            }}
            className="relative h-full bg-zinc-950 cursor-pointer group/img overflow-hidden"
          >
            <img 
              src={img} 
              alt={`Media ${idx + 1}`} 
              className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-[1.02]" 
              loading="lazy" 
            />
          </div>
        ))}

        {/* 4th box with overlay count */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            openLightbox(images, 3);
          }}
          className="relative h-full bg-zinc-950 cursor-pointer overflow-hidden group/img"
        >
          <img 
            src={images[3]} 
            alt="Media 4" 
            className="w-full h-full object-cover" 
            loading="lazy" 
          />
          <div className="absolute inset-0 bg-black/65 hover:bg-black/55 transition-colors flex items-center justify-center backdrop-blur-[1px]">
            <span className="text-white font-black text-xl sm:text-2xl drop-shadow-lg">
              +{images.length - 3}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[720px] mx-auto flex flex-col gap-4 pb-12">
      {/* HEADER */}
      <header 
        className="sticky top-0 z-40 -mx-4 sm:-mx-8 px-4 sm:px-8 pt-12 sm:pt-12 pb-2.5 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 flex items-center justify-between"
        style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))' }}
      >
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onOpenMenu}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-white tracking-wide">
              {lang === 'zh' ? '随手笔记' : 'Notes'}
            </h1>
            <span className="text-[10px] text-gold font-bold px-1.5 py-0.5 rounded bg-gold/10 border border-gold/30">
              {notes.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onToggleLang && <LanguageToggle lang={lang} onToggle={onToggleLang} />}
          <button 
            onClick={handleOpenNewNote}
            className="flex items-center gap-1 px-3 py-1.5 bg-gold hover:bg-yellow-400 text-zinc-950 font-bold rounded-lg text-xs transition-all active:scale-95 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '写心得' : 'Post'}</span>
          </button>
        </div>
      </header>

      {/* COMPOSER TRIGGER */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-700 via-gold to-yellow-300 p-0.5 shadow-sm shrink-0 overflow-hidden">
            {profileAvatar ? (
              <img src={profileAvatar} alt="Profile" className="w-full h-full rounded-full object-cover bg-zinc-950" />
            ) : (
              <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center text-gold font-black text-xs">
                王
              </div>
            )}
          </div>
          <button 
            type="button"
            onClick={handleOpenNewNote}
            className="flex-1 text-left bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 px-3.5 py-2 rounded-full text-xs cursor-pointer transition-all flex items-center justify-between min-w-0"
          >
            <span className="truncate pr-2 text-zinc-400">
              {lang === 'zh' ? '写笔记 / 心得...' : "Write a note..."}
            </span>
            <Edit3 className="w-3.5 h-3.5 text-gold shrink-0" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-xs">
          <button 
            type="button"
            onClick={() => {
              handleOpenNewNote();
              setTimeout(() => fileInputRef.current?.click(), 120);
            }}
            className="py-1.5 rounded-xl flex items-center justify-center gap-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-all font-semibold"
          >
            <ImageIcon className="w-4 h-4 text-emerald-400" />
            <span>{lang === 'zh' ? '发照片' : 'Photos'}</span>
          </button>

          <button 
            type="button"
            onClick={handleOpenNewNote}
            className="py-1.5 rounded-xl flex items-center justify-center gap-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-all font-semibold"
          >
            <Sparkles className="w-4 h-4 text-gold" />
            <span>{lang === 'zh' ? '撰写笔记' : 'Write Note'}</span>
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={lang === 'zh' ? '搜索动态笔记、关键词分类、心得内容...' : 'Search posts, keywords and content...'}
          className="w-full pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-gold/50 transition-colors"
        />
      </div>

      {/* KEYWORD CATEGORIES FILTER BAR */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-0.5">
        <button
          type="button"
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all flex items-center gap-1 cursor-pointer ${
            selectedCategory === null
              ? 'bg-gold text-zinc-950 shadow-sm'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
          }`}
        >
          <span>{lang === 'zh' ? '全部' : 'All'}</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedCategory === null ? 'bg-zinc-950/20 text-zinc-950 font-bold' : 'bg-zinc-800 text-zinc-400'}`}>
            {notes.length}
          </span>
        </button>

        {allCategories.map(cat => {
          const count = notes.filter(n => (n.keywords || []).includes(cat)).length;
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(isSelected ? null : cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-gold text-zinc-950 font-bold shadow-sm'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              <span>#{cat}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? 'bg-zinc-950/20 text-zinc-950 font-bold' : 'bg-zinc-800 text-zinc-400'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* FILTER STATUS NOTIFICATION */}
      {selectedCategory && (
        <div className="flex items-center justify-between bg-gold/10 border border-gold/30 px-3 py-1.5 rounded-xl text-xs text-gold">
          <div className="flex items-center gap-1.5 font-bold">
            <Tag className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? `当前关键词分类：#${selectedCategory}` : `Filtered by: #${selectedCategory}`}</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className="text-[11px] underline hover:text-white cursor-pointer"
          >
            {lang === 'zh' ? '清除分类' : 'Clear filter'}
          </button>
        </div>
      )}

      {/* NOTES LIST */}
      <div className="flex flex-col gap-4 min-h-[300px]">
        {filteredNotes.length === 0 ? (
          <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-2.5">
            <BookOpen className="w-8 h-8 text-zinc-600" />
            <p className="text-xs text-zinc-400 font-medium">
              {selectedCategory 
                ? (lang === 'zh' ? `暂无分类为“#${selectedCategory}”的笔记` : `No notes under #${selectedCategory}`)
                : (lang === 'zh' ? '暂无笔记动态' : 'No posts yet')}
            </p>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-xs text-gold underline hover:text-white mt-1 cursor-pointer"
              >
                {lang === 'zh' ? '查看全部笔记' : 'View all notes'}
              </button>
            )}
            {notes.length === 0 && (
              <button
                onClick={handleOpenNewNote}
                className="mt-1 px-4 py-1.5 bg-gold/10 hover:bg-gold text-gold hover:text-zinc-950 font-bold rounded-xl text-xs transition-all border border-gold/30 active:scale-95"
              >
                {lang === 'zh' ? '发布第一条动态' : 'Create First Post'}
              </button>
            )}
          </div>
        ) : (
          filteredNotes.map(item => {
            const isExpanded = !!expandedNotes[item.id];
            const isLong = item.content && item.content.length > 90;

            return (
              <article
                key={item.id}
                className="bg-zinc-900/85 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-2.5 transition-all duration-150 shadow-sm overflow-hidden w-full max-w-full min-w-0"
              >
                {/* 1. POST HEADER */}
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-700 via-gold to-yellow-300 p-0.5 shadow-sm shrink-0 overflow-hidden">
                      {profileAvatar ? (
                        <img src={profileAvatar} alt="Author" className="w-full h-full rounded-full object-cover bg-zinc-950" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center text-gold font-black text-xs">
                          王
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-white tracking-wide hover:underline cursor-pointer">
                          {profileName || 'Archan Wang'}
                        </span>
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-gold text-zinc-950" title="Verified">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-gold/10 text-gold border border-gold/25 font-semibold">
                          {lang === 'zh' ? '随手心得' : 'Insight'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium pt-0.5">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3 text-zinc-500" />
                          {item.date}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5 text-zinc-500">
                          <Globe className="w-3 h-3 text-zinc-500" />
                          {lang === 'zh' ? '公开' : 'Public'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top Right Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenNote(item)}
                      title={lang === 'zh' ? '编辑笔记' : 'Edit note'}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      title={lang === 'zh' ? '删除笔记' : 'Delete note'}
                      className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 2. POST TITLE */}
                {item.title && (
                  <h2 
                    onClick={() => handleOpenNote(item)}
                    className="text-sm sm:text-base font-bold text-zinc-100 hover:text-gold transition-colors cursor-pointer flex items-center gap-1.5 break-all break-words [overflow-wrap:anywhere] min-w-0"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-gold shrink-0" />
                    <span className="break-all break-words">{item.title}</span>
                  </h2>
                )}

                {/* 3. KEYWORDS CATEGORY BADGES */}
                {item.keywords && item.keywords.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {item.keywords.map(kw => (
                      <button
                        key={kw}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCategory(kw);
                        }}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                          selectedCategory === kw
                            ? 'bg-gold text-zinc-950 font-bold shadow-sm'
                            : 'bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30'
                        }`}
                        title={lang === 'zh' ? `点击筛选：#${kw}` : `Filter by: #${kw}`}
                      >
                        <span className="opacity-70 font-mono">#</span>
                        <span>{kw}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* 4. POST BODY */}
                {item.content && (
                  <div className="text-xs sm:text-[13px] text-zinc-200 leading-relaxed whitespace-pre-line font-normal break-all break-words [overflow-wrap:anywhere] min-w-0 max-w-full overflow-hidden">
                    {isLong && !isExpanded ? (
                      <>
                        <span className="break-all break-words [overflow-wrap:anywhere]">
                          {item.content.slice(0, 90)}...
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(item.id);
                          }}
                          className="ml-1.5 text-gold hover:underline font-semibold text-xs inline-block shrink-0 cursor-pointer"
                        >
                          {lang === 'zh' ? '查看更多' : 'See more'}
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="break-all break-words [overflow-wrap:anywhere]">
                          {item.content}
                        </span>
                        {isLong && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(item.id);
                            }}
                            className="ml-2 text-zinc-400 hover:text-gold text-xs inline-block shrink-0 cursor-pointer"
                          >
                            {lang === 'zh' ? '收起' : 'Show less'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* 5. ATTACHED IMAGES */}
                {item.images && item.images.length > 0 && (
                  <div className="pt-1">
                    {renderFacebookImages(item.images)}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* NOTE COMPOSER / EDITOR MODAL */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
              <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-gold" />
                {selectedNote 
                  ? (lang === 'zh' ? '编辑笔记' : 'Edit Note') 
                  : (lang === 'zh' ? '发表心得笔记' : 'Create Note')}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setSelectedNote(null);
                }}
                className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Scrollable Area */}
            <div className="p-4 overflow-y-auto flex flex-col gap-3.5">
              
              {/* Title & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2 flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-zinc-300">
                    {lang === 'zh' ? '标题' : 'Title'}
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder={lang === 'zh' ? '例如: 补财库心得、今日问事' : 'Note Title'}
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-gold/50 font-medium"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3 text-gold" />
                    {lang === 'zh' ? '日期' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-gold/50"
                  />
                </div>
              </div>

              {/* KEYWORD CATEGORIES SECTION (关键词分类) */}
              <div className="flex flex-col gap-2 p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-gold" />
                    <span>{lang === 'zh' ? '关键词分类 (多选)' : 'Keyword Categories'}</span>
                  </label>
                  <span className="text-[10px] text-zinc-400">
                    {formKeywords.length} {lang === 'zh' ? '个标签' : 'tags'}
                  </span>
                </div>

                {/* Selected Keywords Tags */}
                {formKeywords.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {formKeywords.map(kw => (
                      <span 
                        key={kw}
                        className="px-2 py-0.5 rounded-md bg-gold/15 text-gold border border-gold/40 text-xs font-semibold flex items-center gap-1 shadow-sm"
                      >
                        <span>#{kw}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFormKeyword(kw)}
                          className="hover:text-rose-400 ml-0.5 p-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Add Custom Keyword */}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={customKeywordInput}
                    onChange={(e) => setCustomKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomKeyword();
                      }
                    }}
                    placeholder={lang === 'zh' ? '输入自定义关键词 (如: 化煞、招财)...' : 'Add custom keyword...'}
                    className="flex-1 px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-gold"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomKeyword}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 border border-zinc-700"
                  >
                    {lang === 'zh' ? '+ 添加' : '+ Add'}
                  </button>
                </div>

                {/* Quick Preset Keyword Chips */}
                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-[10px] text-zinc-400">
                    {lang === 'zh' ? '快捷关键词推荐：' : 'Preset recommendations:'}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PRESET_KEYWORDS.map(preset => {
                      const isChecked = formKeywords.includes(preset);
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleToggleFormKeyword(preset)}
                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-gold text-zinc-950 border-gold font-bold shadow-sm'
                              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                          }`}
                        >
                          #{preset}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Notes Content */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-zinc-300">
                  {lang === 'zh' ? '内容' : 'Content'}
                </label>
                <textarea
                  rows={5}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder={lang === 'zh' ? '写下您的感悟、个案观察或心得...' : 'Write your notes...'}
                  className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-gold/50 leading-relaxed resize-none"
                />
              </div>

              {/* Upload Pictures */}
              <div className="flex flex-col gap-1.5 pt-1 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-gold flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    {lang === 'zh' ? '图片' : 'Photos'}
                  </label>
                  <span className="text-[10px] text-zinc-500">
                    {formImages.length} {lang === 'zh' ? '图' : 'photos'}
                  </span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-zinc-900/60 hover:bg-zinc-900 border border-dashed border-zinc-700 hover:border-gold/50 rounded-xl p-2.5 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <UploadCloud className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs font-semibold text-zinc-300">
                    {isUploading 
                      ? (lang === 'zh' ? '处理中...' : 'Processing...') 
                      : (lang === 'zh' ? '选图片' : 'Upload Photos')}
                  </span>
                </div>

                {/* Image Grid in Form */}
                {formImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-1.5 mt-1">
                    {formImages.map((img, idx) => (
                      <div key={idx} className="relative group/thumb rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900 aspect-square">
                        <img 
                          src={img} 
                          alt={`Uploaded ${idx + 1}`} 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => openLightbox(formImages, idx)}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(idx);
                          }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 hover:bg-rose-600 text-white flex items-center justify-center text-[10px]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between gap-2">
              {selectedNote ? (
                <button
                  type="button"
                  onClick={() => handleDelete(selectedNote.id)}
                  className="px-2.5 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'zh' ? '删除' : 'Delete'}</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedNote(null);
                  }}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-lg text-xs transition-colors"
                >
                  {lang === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-1.5 bg-gold hover:bg-yellow-400 text-zinc-950 font-bold rounded-lg text-xs transition-all shadow-sm active:scale-95"
                >
                  {lang === 'zh' ? '发布' : 'Post'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* FULL-SCREEN GALLERY LIGHTBOX */}
      {lightboxData && (
        <div 
          onClick={() => setLightboxData(null)}
          className="fixed inset-0 bg-black/95 z-[200] flex flex-col items-center justify-center p-3 backdrop-blur-md select-none"
        >
          {/* Top Bar */}
          <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between text-white z-10 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <span>{lightboxData.index + 1}</span>
              <span>/</span>
              <span>{lightboxData.images.length}</span>
            </div>
            <button
              onClick={() => setLightboxData(null)}
              className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Previous Arrow */}
          {lightboxData.images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxData(prev => prev ? {
                  ...prev,
                  index: (prev.index - 1 + prev.images.length) % prev.images.length
                } : null);
              }}
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-zinc-800 text-white flex items-center justify-center transition-all z-10 border border-zinc-700/50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Image */}
          <img 
            src={lightboxData.images[lightboxData.index]} 
            alt={`Preview ${lightboxData.index + 1}`} 
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next Arrow */}
          {lightboxData.images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxData(prev => prev ? {
                  ...prev,
                  index: (prev.index + 1) % prev.images.length
                } : null);
              }}
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-zinc-800 text-white flex items-center justify-center transition-all z-10 border border-zinc-700/50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
