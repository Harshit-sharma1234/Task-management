'use client'

import { useState, useEffect, useRef } from 'react'
import { PenLine, Loader2, Check, Bold, Italic, Underline as UnderlineIcon, List } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null
  }

  return (
    <div className="flex items-center gap-1 mb-3 pb-2 border-b border-slate-100/50">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`p-1.5 rounded transition-colors ${editor.isActive('bold') ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
        title="Bold"
      >
        <Bold size={14} strokeWidth={2.5} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded transition-colors ${editor.isActive('italic') ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
        title="Italic"
      >
        <Italic size={14} strokeWidth={2.5} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-1.5 rounded transition-colors ${editor.isActive('underline') ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
        title="Underline"
      >
        <UnderlineIcon size={14} strokeWidth={2.5} />
      </button>
      <div className="w-px h-4 bg-slate-200 mx-1" />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1.5 rounded transition-colors ${editor.isActive('bulletList') ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
        title="Bullet List"
      >
        <List size={14} strokeWidth={2.5} />
      </button>
    </div>
  )
}

const supabase = createClient()

export function ScratchpadWidget({ userId, initialContent }: { userId: string, initialContent: string }) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const lastSavedContent = useRef(initialContent)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none flex-1 overflow-y-auto h-full text-[13px] text-slate-700 leading-relaxed min-h-[140px]',
      },
    },
    onUpdate: ({ editor }: any) => {
      const html = editor.getHTML()
      
      // Skip if content is identical to last saved
      if (html === lastSavedContent.current) return

      setSaveStatus('saving')

      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(async () => {
        const { error } = await supabase
          .from('user_notes')
          .upsert({ 
            user_id: userId, 
            content: html, 
            updated_at: new Date().toISOString() 
          })
        
        if (!error) {
           lastSavedContent.current = html
           setSaveStatus('saved')
           setTimeout(() => setSaveStatus('idle'), 800)
        } else {
           console.error('Failed to save scratchpad:', error)
           setSaveStatus('idle')
        }
      }, 150)
    },
  })

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (editor) editor.destroy()
    }
  }, [editor])

  return (
    <div className="premium-card rounded-2xl p-6 relative overflow-hidden group flex flex-col h-full min-h-[280px]">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 to-transparent pointer-events-none" />
      <div className="flex items-center justify-between mb-2 relative z-10">
        <h3 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          <PenLine size={16} className="text-amber-500" />
          Personal Scratchpad
        </h3>
        <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-1 min-w-[60px] justify-end">
          {saveStatus === 'saving' && <><Loader2 size={10} className="animate-spin" /> Saving</>}
          {saveStatus === 'saved' && <><Check size={10} className="text-emerald-500" /> Saved</>}
        </div>
      </div>
      
      <div className="relative z-10 flex flex-col flex-1 h-full">
        <MenuBar editor={editor} />
        <EditorContent editor={editor} className="flex-1 h-full overflow-hidden flex flex-col cursor-text" onClick={() => editor?.commands.focus()} />
      </div>
    </div>
  )
}
