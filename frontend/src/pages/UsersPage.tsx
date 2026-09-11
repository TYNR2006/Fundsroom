import { FormEvent, useEffect, useState } from 'react';
import { erpApi, type ManagedUser } from '../api/erp';
import { useToast } from '../context/ToastContext';

export default function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'SALES' as ManagedUser['role'] });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const load = () => erpApi.users.list().then(setUsers).catch((e) => setError(e instanceof Error ? e.message : 'Unable to load users.'));
  useEffect(() => { load(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    try { await erpApi.users.create(form); setForm({ name: '', email: '', password: '', role: 'SALES' }); setMessage('User created successfully.'); toast.success('User created successfully.'); load(); }
    catch (e) { const message = e instanceof Error ? e.message : 'Unable to create user.'; setError(message); toast.error(message); }
  }
  return <div className="page"><div className="page-intro"><div><p className="eyebrow">ADMINISTRATION</p><h1>Users</h1><p className="muted">Create internal users and assign operational roles.</p></div></div>
    <div className="dashboard-grid"><form className="panel stack" onSubmit={submit}><h3>Create user</h3>{error && <div className="alert">{error}</div>}{message && <div className="alert" style={{ color: '#15803d' }}>{message}</div>}
      <label>Name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
      <label>Email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
      <label>Password<input required minLength={8} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
      <label>Role<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as ManagedUser['role'] })}><option>ADMIN</option><option>SALES</option><option>WAREHOUSE</option><option>ACCOUNTS</option></select></label>
      <button className="primary">Create user</button></form>
      <div className="panel"><h3>Existing users</h3><div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>{users.map(user => <tr key={user.id}><td>{user.name}</td><td>{user.email}</td><td><span className="status confirmed">{user.role}</span></td></tr>)}</tbody></table></div></div>
    </div></div>;
}
