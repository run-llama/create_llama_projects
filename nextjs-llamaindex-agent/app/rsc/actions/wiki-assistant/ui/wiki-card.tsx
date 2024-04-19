import { Button } from "@/app/components/ui/button";
import ChatMessage from "@/app/components/ui/chat/chat-message";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { NotebookTabs } from "lucide-react";

export default function WikiSummaryCard({
  result,
  detail,
}: {
  result: string;
  detail: string;
}) {
  return (
    <div className="flex gap-2 justify-between items-start">
      <div className="flex-1">
        <ChatMessage role="function" message={result} />
      </div>
      <Dialog>
        <DialogTrigger>
          <Button variant="secondary" size="icon" className="mr-2 mt-5">
            <NotebookTabs className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Information from Wikipedia</DialogTitle>
            <DialogDescription>
              <p className="mt-4 max-h-80 overflow-auto">{detail}</p>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
