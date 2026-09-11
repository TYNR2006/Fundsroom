import { useAuth } from './context/AuthContext';

function App() {
  const { loading, isAuthenticated, user } = useAuth();

  if (loading) {
    return <main aria-live="polite">Checking authentication...</main>;
  }

  return (
    <main>
      <h1>Fundsroom ERP</h1>
      <p>
        Authentication foundation ready.{' '}
        {isAuthenticated ? `Signed in as ${user?.name}.` : 'No user is signed in.'}
      </p>
    </main>
  );
}

export default App;
