import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type Note = {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export const useNotes = (projectId: string | null) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
    if (!user || !projectId) { setNotes([]); setLoading(false); return; }
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setNotes(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchNotes(); }, [user, projectId]);

  const createNote = async (content: string = "") => {
    if (!user || !projectId) return null;
    const { data, error } = await supabase
      .from("notes")
      .insert({ content, project_id: projectId, user_id: user.id })
      .select()
      .single();
    if (!error && data) setNotes((prev) => [data, ...prev]);
    return data;
  };

  const updateNote = async (id: string, updates: { content?: string; title?: string }) => {
    const { data, error } = await supabase.from("notes").update(updates).eq("id", id).select().single();
    if (!error && data) setNotes((prev) => prev.map((n) => (n.id === id ? data : n)));
    return data;
  };

  const deleteNote = async (id: string) => {
    await supabase.from("notes").delete().eq("id", id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return { notes, loading, createNote, updateNote, deleteNote, refetch: fetchNotes };
};
