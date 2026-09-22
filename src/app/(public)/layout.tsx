export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 font-sans antialiased selection:bg-stone-200">
      {children}
    </div>
  );
}
