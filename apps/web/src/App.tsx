import { Outlet } from 'react-router-dom';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 px-6 lg:px-10 py-8 mx-auto w-full max-w-7xl">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
