import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

const CartItemSkeleton = () => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <Skeleton className="w-16 h-16 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CartSkeleton = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto space-y-4 mt-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <CartItemSkeleton key={i} />
        ))}
      </div>
      <div className="border-t pt-4 mt-4 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-10 w-full rounded" />
      </div>
    </div>
  );
};

export { CartItemSkeleton, CartSkeleton };