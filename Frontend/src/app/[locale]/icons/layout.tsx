interface IconsLayoutProps {
  children: React.ReactNode;
}

export default function IconsLayout({ children }: IconsLayoutProps) {
  return (
    <div className="relative px-4 sm:px-6 md:px-10 py-4 sm:py-6 md:py-10 h-full">
      <div className="border border-border rounded-lg py-6 sm:py-10 md:py-14 px-4 sm:px-8 md:px-16 h-full overflow-auto">
      {children}
      </div>
    </div>
  )
}