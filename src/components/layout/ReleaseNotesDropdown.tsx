import { useState } from 'react';
import { Bell, Settings, MoreVertical, FileText, CheckCircle2 } from 'lucide-react';
import { useReleaseNotes } from '@/hooks/useReleaseNotes';
import { ReleaseNote } from '@/types/releaseNotes';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Formatador nativo
const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(new Date(dateString));
};

const formatDateTime = (dateString: string) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString));
};

export function ReleaseNotesDropdown() {
  const { unreadNotes, readNotes, unreadCount, markAsRead, markAsUnread } = useReleaseNotes();
  const [viewMode, setViewMode] = useState<'unread' | 'history'>('unread');
  const [selectedNote, setSelectedNote] = useState<ReleaseNote | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const notesToShow = viewMode === 'unread' ? unreadNotes : readNotes;

  const handleOpenNote = (note: ReleaseNote) => {
    setSelectedNote(note);
    setDropdownOpen(false);
  };

  const handleCloseModal = (open: boolean) => {
    if (!open && selectedNote) {
      if (viewMode === 'unread') {
        markAsRead(selectedNote.id);
      }
      setSelectedNote(null);
    }
  };

  const handleMarkAsUnread = () => {
    if (selectedNote) {
      markAsUnread(selectedNote.id);
      setSelectedNote(null);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setDropdownOpen(open);
    if (open) {
      setViewMode('unread');
    }
  };

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors flex items-center gap-2">
            <div className="relative">
              <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-blue-500' : 'text-muted-foreground'}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <span className="hidden md:inline-block text-sm font-medium text-blue-500 animate-pulse">
                Novidades!
              </span>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-80 p-0 border-border">
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
            <DropdownMenuLabel className="p-0 font-semibold text-sm">
              {viewMode === 'unread' ? 'Novas Atualizações' : 'Histórico de Atualizações'}
            </DropdownMenuLabel>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setViewMode(prev => prev === 'unread' ? 'history' : 'unread');
              }}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
              title={viewMode === 'unread' ? 'Ver lidas' : 'Ver não lidas'}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-[350px] overflow-y-auto">
            {notesToShow.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {viewMode === 'unread' 
                  ? 'Você já leu todas as novidades!' 
                  : 'Nenhuma atualização no histórico.'}
              </div>
            ) : (
              notesToShow.map(note => (
                <div 
                  key={note.id}
                  className="flex flex-col gap-1 p-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer group relative"
                  onClick={() => handleOpenNote(note)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider">
                        {note.module_name}
                      </span>
                      <span className="text-sm font-medium truncate text-foreground">
                        {note.title}
                      </span>
                    </div>
                    <button className="p-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-background">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {note.summary}
                  </p>
                  
                  <span className="text-[10px] text-muted-foreground/70 mt-2 block">
                    {formatDate(note.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal Tela Cheia para Visualizar a Nota */}
      <Dialog open={!!selectedNote} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          {selectedNote && (
            <>
              <DialogHeader className="p-6 border-b border-border bg-muted/20 shrink-0 relative overflow-hidden">
                {/* Marca d'água — logo repetida no fundo do header */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-0"
                  style={{
                    backgroundImage: 'url(/logo.png)',
                    backgroundSize: '64px 64px',
                    backgroundRepeat: 'repeat',
                    opacity: 0.05,
                    filter: 'grayscale(100%)',
                  }}
                />
                
                <div className="relative z-10 flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 text-xs font-semibold bg-blue-500/10 text-blue-500 rounded-md uppercase tracking-wider">
                    {selectedNote.module_name}
                  </span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <FileText className="w-4 h-4" /> Release Braga Mentoring
                  </span>
                </div>
                <DialogTitle className="relative z-10 text-2xl font-bold">
                  {selectedNote.title}
                </DialogTitle>
                <DialogDescription className="relative z-10 text-sm mt-1">
                  Publicado em {formatDateTime(selectedNote.created_at)}
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto p-6 md:p-8 relative">
                {/* O conteúdo principal renderizado (HTML ou texto) */}
                <div 
                  className="max-w-none text-muted-foreground leading-relaxed
                             [&>h3]:text-xl [&>h3]:font-bold [&>h3]:text-foreground [&>h3]:mb-4 [&>h3]:mt-2
                             [&>p]:mb-4 
                             [&_strong]:font-semibold [&_strong]:text-blue-400
                             [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-4 [&>ul>li]:mb-2
                             prose-img:rounded-md prose-img:border prose-img:border-border"
                  dangerouslySetInnerHTML={{ __html: selectedNote.content }}
                />
              </div>

              <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center shrink-0 flex-wrap gap-4">
                {viewMode === 'unread' ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Será marcada como lida ao fechar.
                  </p>
                ) : (
                  <button 
                    onClick={handleMarkAsUnread}
                    className="text-sm font-medium text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-2"
                  >
                    Marcar como não lida
                  </button>
                )}
                
                <button 
                  onClick={() => handleCloseModal(false)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors ml-auto"
                >
                  Entendi, fechar
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
