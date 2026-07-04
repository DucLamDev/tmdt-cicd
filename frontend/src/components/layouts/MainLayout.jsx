import { Outlet } from 'react-router-dom';
import Header from '../Header';
import Footer from '../Footer';
import ChatbotWidget from '../ChatbotWidget';
import CompareFloatingButton from '../CompareFloatingButton';

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 page-shell">
        <Outlet />
      </main>
      <Footer />
      <ChatbotWidget />
      <CompareFloatingButton />
    </div>
  );
};

export default MainLayout;
