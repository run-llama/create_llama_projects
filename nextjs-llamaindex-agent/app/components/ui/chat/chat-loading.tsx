import { Loader2 } from "lucide-react";

export default function ChatLoading() {
  return (
    <div className="flex justify-center items-center pt-10">
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>
  );
}
