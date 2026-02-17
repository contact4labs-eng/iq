interface PageSkeletonProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export function PageSkeleton({ title, description, icon }: PageSkeletonProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          {icon}
          <h1 className="text-2xl font-bold font-display text-foreground">{title}</h1>
        </div>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border rounded-lg p-6 h-36 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Σύντομα διαθέσιμο</p>
          </div>
        ))}
      </div>
    </div>
  );
}
