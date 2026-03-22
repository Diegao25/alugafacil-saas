'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'react-toastify';
import { Plus, Trash2, Edit3, X, Eye, EyeOff } from 'lucide-react';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '@/lib/utils';

type UserItem = {
  id: string;
  nome: string;
  email: string;
  data_criacao: string;
  is_admin?: boolean;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editingData, setEditingData] = useState({ nome: '', email: '', senha: '' });
  const [editingLoading, setEditingLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isStrongPassword(formData.senha)) {
      toast.error(PASSWORD_POLICY_MESSAGE);
      return;
    }

    setSaving(true);
    try {
      const response = await api.post('/users', formData);
      setUsers((prev) => [response.data, ...prev]);
      setFormData({ nome: '', email: '', senha: '' });
      toast.success('Usuário cadastrado com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao cadastrar usuário');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(userId: string) {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      await api.delete(`/users/${userId}`);
      setUsers((prev) => prev.filter((item) => item.id !== userId));
      toast.success('Usuário excluído');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao excluir usuário');
    }
  }

  function openEdit(user: UserItem) {
    setEditingUser(user);
    setEditingData({ nome: user.nome, email: user.email, senha: '' });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;

    if (editingData.senha && !isStrongPassword(editingData.senha)) {
      toast.error(PASSWORD_POLICY_MESSAGE);
      return;
    }

    setEditingLoading(true);
    try {
      const payload: { nome?: string; email?: string; senha?: string } = {
        nome: editingData.nome,
        email: editingData.email
      };
      if (editingData.senha) {
        payload.senha = editingData.senha;
      }
      const response = await api.put(`/users/${editingUser.id}`, payload);
      setUsers((prev) => prev.map((item) => (item.id === editingUser.id ? response.data : item)));
      toast.success('Usuário atualizado');
      setEditingUser(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar usuário');
    } finally {
      setEditingLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Usuários</h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-slate-800 mb-4">
          <Plus className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold">Cadastrar novo usuário</h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Nome</label>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              placeholder="Nome completo"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">E-mail</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              placeholder="email@exemplo.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Senha</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={formData.senha}
                onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 pr-11 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                placeholder="Senha inicial"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
                aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-500">{PASSWORD_POLICY_MESSAGE}</p>
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70"
            >
              {saving ? 'Salvando...' : 'Cadastrar usuário'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Nome</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">E-mail</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Perfil</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{user.nome}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {user.is_admin ? 'Administrador' : 'Usuário'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(user)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                          Editar
                        </button>
                        {!user.is_admin && (
                          <button
                            type="button"
                            onClick={() => handleDelete(user.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setEditingUser(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Editar usuário</p>
                <p className="text-lg font-semibold text-slate-800">{editingUser.nome}</p>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setEditingUser(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nome</label>
                <input
                  type="text"
                  required
                  value={editingData.nome}
                  onChange={(e) => setEditingData({ ...editingData, nome: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">E-mail</label>
                <input
                  type="email"
                  required
                  value={editingData.email}
                  onChange={(e) => setEditingData({ ...editingData, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nova senha (opcional)</label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editingData.senha}
                    onChange={(e) => setEditingData({ ...editingData, senha: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-11 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                    placeholder="Deixe em branco para manter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
                    aria-label={showEditPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500">{PASSWORD_POLICY_MESSAGE}</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl font-semibold shadow-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editingLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-semibold shadow-sm transition-all disabled:opacity-70"
                >
                  {editingLoading ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
