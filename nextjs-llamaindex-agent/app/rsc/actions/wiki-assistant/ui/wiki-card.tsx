import ChatMessage from "@/app/components/ui/chat/chat-message";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";

export default function WikiSummaryCard({
  result,
  detail,
}: {
  result: string;
  detail: string;
}) {
  return (
    <div className="flex gap-2 items-center">
      <ChatMessage role="function" message={result} />
      <Dialog>
        <DialogTrigger>Detail</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Information from Wikipedia</DialogTitle>
            <DialogDescription>{detail}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
