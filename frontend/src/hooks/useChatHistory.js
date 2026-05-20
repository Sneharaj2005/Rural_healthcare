/**
 * useChatHistory — manages conversation list and per-conversation messages.
 *
 * Wraps all /ai/conversations API calls with TanStack Query for
 * automatic caching, background refetch, and optimistic updates.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../lib/axios'

const KEYS = {
  list:    ['chat-conversations'],
  detail:  (id) => ['chat-conversation', id],
  messages:(id) => ['chat-messages', id],
}

export function useChatHistory() {
  const qc = useQueryClient()

  // ── List conversations ──────────────────────────────────────────────────
  const conversationsQuery = useQuery({
    queryKey: KEYS.list,
    queryFn:  () => api.get('/ai/conversations?limit=50').then((r) => r.data),
    staleTime: 1000 * 30,
    retry: 1,
  })

  // ── Load one conversation (with messages) ───────────────────────────────
  const useConversation = (id) =>
    useQuery({
      queryKey: KEYS.detail(id),
      queryFn:  () => api.get(`/ai/conversations/${id}`).then((r) => r.data),
      enabled:  !!id,
      staleTime: 1000 * 60,
    })

  // ── Rename ──────────────────────────────────────────────────────────────
  const renameMutation = useMutation({
    mutationFn: ({ id, title }) =>
      api.patch(`/ai/conversations/${id}`, { title }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.list })
      toast.success('Conversation renamed.')
    },
    onError: () => toast.error('Failed to rename conversation.'),
  })

  // ── Delete one ──────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/ai/conversations/${id}`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: KEYS.list })
      qc.removeQueries({ queryKey: KEYS.detail(id) })
      toast.success('Conversation deleted.')
    },
    onError: () => toast.error('Failed to delete conversation.'),
  })

  // ── Delete all ──────────────────────────────────────────────────────────
  const deleteAllMutation = useMutation({
    mutationFn: () => api.delete('/ai/conversations').then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: KEYS.list })
      toast.success(data.message || 'All conversations deleted.')
    },
    onError: () => toast.error('Failed to delete conversations.'),
  })

  // ── Invalidate list (called after a new message is sent) ────────────────
  const refreshList = () => qc.invalidateQueries({ queryKey: KEYS.list })

  return {
    conversations:    conversationsQuery.data?.conversations ?? [],
    totalConversations: conversationsQuery.data?.total ?? 0,
    isLoading:        conversationsQuery.isLoading,
    isError:          conversationsQuery.isError,
    useConversation,
    rename:           renameMutation,
    deleteOne:        deleteMutation,
    deleteAll:        deleteAllMutation,
    refreshList,
  }
}
