import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

const ProductSkeleton = () => {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-square overflow-hidden">
        <Skeleton className="h-full w-full" />
      </div>
      <div className="p-6 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-6 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-16" />
          </div>
        </div>
      </div>
    </Card>
  );
};

const ProductGridSkeleton = () => {
  return (
    <section id="produtos" className="container py-14 md:py-20">
      <div className="mb-8 flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProductSkeleton key={i} />
        ))}
      </div>
    </section>
  );
};

export { ProductSkeleton, ProductGridSkeleton };