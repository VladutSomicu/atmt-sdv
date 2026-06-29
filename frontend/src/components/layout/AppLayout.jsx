import Sidebar from './Sidebar';

export default function AppLayout({ children, breadcrumb = [] }) {
  return (
    <div className="flex min-h-screen bg-gray-950 min-w-[1024px]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        <main className="flex-1 p-6">
          {children}
        </main>

        {/* Global Footer */}
        <footer className="border-t border-gray-900/50 bg-gray-950 px-6 py-2.5 shrink-0">
          <div className="flex items-center justify-between text-[10px] text-gray-600 uppercase tracking-widest font-medium">
            <span>&copy; {new Date().getFullYear()} ATMT-SDV. All rights reserved.</span>
            <span>Developed by Andrei Vladut Somicu</span>
          </div>
        </footer>
      </div>
    </div>
  );
}