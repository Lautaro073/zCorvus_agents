interface IconsLayoutProps {
  children: React.ReactNode;
}

export default function IconsLayout({ children }: IconsLayoutProps) {
  return (
    <div className="relative h-full px-1 sm:px-2 md:px-4">
      <div className="relative h-full overflow-auto rounded-[2rem]">
        <div className="pointer-events-none absolute -top-16 left-6 -z-10 h-56 w-56 rounded-full bg-secondary/55 blur-3xl" />
        <div className="pointer-events-none absolute top-24 right-4 -z-10 h-48 w-48 rounded-full bg-accent/35 blur-3xl" />
        <div className="mx-auto flex h-full w-full max-w-[1540px] flex-col px-3 py-4 sm:px-5 sm:py-6 md:px-8 md:py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
