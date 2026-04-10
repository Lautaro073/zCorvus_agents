export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6 pb-4" aria-busy="true" aria-live="polite">
      <section className="rounded-[2rem] border border-border/70 bg-secondary/35 p-5 sm:p-6">
        <p className="ui-section-header">ADMIN</p>
        <div className="mt-2 h-10 w-2/3 rounded-md bg-muted/70" />
        <div className="mt-3 h-5 w-full max-w-3xl rounded-md bg-muted/70" />
        <div className="mt-6 grid min-h-[7rem] gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-28 rounded-2xl border border-border/70 bg-background/80" />
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-border/70 bg-background/80 p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="h-9 rounded-md bg-muted/70" />
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, idx) => (
          <article key={idx} className="flex min-h-[30rem] flex-col rounded-[1.5rem] border border-border/70 bg-background/80 p-4">
            <div className="h-7 w-56 rounded-md bg-muted/70" />
            <div className="mt-4 h-64 w-full rounded-md bg-muted/70" />
          </article>
        ))}
      </section>

      <section className="rounded-[1.5rem] border border-border/70 bg-background/80 p-4">
        <div className="h-7 w-72 rounded-md bg-muted/70" />
        <div className="mt-4 grid gap-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-10 w-full rounded-lg bg-muted/70" />
          ))}
        </div>
      </section>
    </div>
  );
}
