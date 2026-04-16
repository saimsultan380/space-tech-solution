import { Spinner } from "@/components/ui/loading";

export default function DashboardLoading() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Spinner />
    </div>
  );
}
