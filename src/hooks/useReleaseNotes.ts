import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ReleaseNote } from '@/types/releaseNotes';

export function useReleaseNotes() {
  const [notes, setNotes] = useState<ReleaseNote[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Busca todas as notas
      const { data: releasesData, error: releasesError } = await supabase
        .from('release_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (releasesError) throw releasesError;

      // 2. Busca quais o usuário já leu
      const { data: readData, error: readError } = await supabase
        .from('user_read_releases')
        .select('release_id');

      if (readError) throw readError;

      // Filtra a nota duplicada conforme solicitado (criada às 14:04 do dia 04/10)
      const filteredReleases = (releasesData || []).filter(n => {
        if (n.title.includes('Carteira Pessoal')) {
          const dateStr = n.created_at || '';
          // Se for dia 04 e hora 14 (ajustando fuso caso necessário), removemos.
          // 2026-10-04T17:04:xxZ no banco equivale a 14:04 UTC-3
          // E 2026-10-04T14:04:xxZ equivale a 11:04 UTC-3.
          // Para ser exato, removemos a que tem 'T17:04' ou 'T14:04' no ISO, ou usamos parse local
          const localDate = new Date(dateStr);
          if (localDate.getDate() === 4 && localDate.getHours() === 14) {
            return false;
          }
          if (dateStr.includes('T17:04') || dateStr.includes('T14:04')) {
            return false;
          }
        }
        return true;
      });

      // Remove duplicates by title, keeping the OLDEST one
      const uniqueReleasesMap = new Map();
      for (const note of filteredReleases) {
        if (!uniqueReleasesMap.has(note.title)) {
          uniqueReleasesMap.set(note.title, note);
        } else {
          // If we already have one, keep the older one
          const existing = uniqueReleasesMap.get(note.title);
          if (new Date(note.created_at) < new Date(existing.created_at)) {
            uniqueReleasesMap.set(note.title, note);
          }
        }
      }
      
      // Parse simple markdown to HTML to ensure the premium layout applies to all notes
      const parsedNotes = Array.from(uniqueReleasesMap.values()).map(n => {
        let html = n.content || '';
        // Convert markdown to HTML if it seems to be markdown
        if (html.includes('###') || html.includes('**') || html.includes('##')) {
          html = html
            .replace(/### (.*?)(?:\r\n|\n|$)/g, '<h3>$1</h3>')
            .replace(/## (.*?)(?:\r\n|\n|$)/g, '<h2>$1</h2>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/- (.*?)(?:\r\n|\n|$)/g, '<ul><li>$1</li></ul>')
            .replace(/<\/ul>(?:\r\n|\n)*<ul>/g, '') // merge adjacent lists
            .replace(/(?:\r\n|\n){2,}/g, '<p></p>');
          
          // Wrap loose text in paragraphs
          html = html.split('\n').map((line: string) => {
            if (line.trim() && !line.startsWith('<')) {
              return `<p>${line}</p>`;
            }
            return line;
          }).join('\n');
        }
        return { ...n, content: html };
      });
      // Sort again descending
      parsedNotes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotes(parsedNotes);
      setReadIds(readData ? readData.map(r => r.release_id) : []);

    } catch (error) {
      console.error('Erro ao buscar novidades:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (releaseId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (readIds.includes(releaseId)) return; // Já lida

      const { error } = await supabase
        .from('user_read_releases')
        .insert({
          user_id: user.id,
          release_id: releaseId
        });

      if (error) {
        // Ignora erro de chave duplicada caso ocorra concorrência
        if (error.code !== '23505') throw error;
      }

      setReadIds(prev => [...prev, releaseId]);
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const markAsUnread = async (releaseId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!readIds.includes(releaseId)) return; // Já não lida

      const { error } = await supabase
        .from('user_read_releases')
        .delete()
        .match({
          user_id: user.id,
          release_id: releaseId
        });

      if (error) throw error;

      setReadIds(prev => prev.filter(id => id !== releaseId));
    } catch (error) {
      console.error('Erro ao marcar como não lida:', error);
    }
  };

  const unreadNotes = notes.filter(n => !readIds.includes(n.id));
  const readNotes = notes.filter(n => readIds.includes(n.id));

  return {
    notes,
    unreadNotes,
    readNotes,
    unreadCount: unreadNotes.length,
    loading,
    markAsRead,
    markAsUnread,
    refresh: fetchNotes
  };
}
