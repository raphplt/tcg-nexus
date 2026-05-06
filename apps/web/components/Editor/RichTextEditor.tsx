import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import LinkExtension from '@tiptap/extension-link'
import ImageExtension from '@tiptap/extension-image'
import { Bold, Italic, Strikethrough, Heading1, Heading2, List, ListOrdered, Quote, Link as LinkIcon, ImageIcon, Undo, Redo } from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'
import { Button } from '@/components/ui/button'

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline decoration-primary/50 underline-offset-4',
        },
      }),
      ImageExtension.configure({
        HTMLAttributes: {
          class: 'rounded-xl max-w-full h-auto',
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 prose prose-sm dark:prose-invert max-w-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = window.prompt('Entrez l\'URL du lien (ex: https://tcg-nexus.org) :');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = window.prompt('Entrez l\'URL de l\'image (ex: https://cdn.tcg-nexus.org/...) :');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="flex flex-col border rounded-md shadow-sm overflow-hidden bg-card">
      <div className="flex flex-wrap items-center gap-1 p-1 border-b bg-muted/40">
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="Mettre en gras"
          title="Mettre en gras"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Mettre en italique"
          title="Mettre en italique"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('strike')}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          aria-label="Barrer"
          title="Barrer"
        >
          <Strikethrough className="h-4 w-4" />
        </Toggle>
        
        <div className="w-px h-4 bg-border mx-1" />
        
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          aria-label="Titre 1"
          title="Titre 1"
        >
          <Heading1 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 3 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          aria-label="Titre 2"
          title="Titre 2"
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        
        <div className="w-px h-4 bg-border mx-1" />
        
        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Liste à puces"
          title="Liste à puces"
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Liste numérotée"
          title="Liste numérotée"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('blockquote')}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
          aria-label="Citation"
          title="Citation"
        >
          <Quote className="h-4 w-4" />
        </Toggle>
        
        <div className="w-px h-4 bg-border mx-1" />
        
        <Button variant="ghost" size="sm" onClick={addLink} className="px-2 h-8" title="Ajouter un lien">
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={addImage} className="px-2 h-8" title="Ajouter une image">
          <ImageIcon className="h-4 w-4" />
        </Button>
        
        <div className="flex-1" />
        
        <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="px-2 h-8" title="Annuler">
          <Undo className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="px-2 h-8" title="Rétablir">
          <Redo className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
