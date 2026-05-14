import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function AppLayout({ children, breadcrumb = [] }) {
  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Navbar breadcrumb={breadcrumb} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}