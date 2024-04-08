import ChatAvatar from "@/app/components/ui/chat/chat-avatar";
import { Plane } from "lucide-react";
import { FlightInfo } from "../shared";

export default function FlightCard({ flightInfo }: { flightInfo: FlightInfo }) {
  return (
    <div className="flex items-start gap-4 pr-5 pt-5">
      <ChatAvatar role="function" />
      <div className="flex flex-1 justify-between gap-2">
        <div className="flex flex-col gap-2 py-4 px-8 rounded-lg bg-emerald-100 capitalize text-emerald-800">
          <div className="font-semibold flex gap-2">
            <span>Flight Informaton</span>
            <Plane />
          </div>
          <hr />
          <p>Flight Number: {flightInfo.flightNumber}</p>
          <p>Departure: {flightInfo.departure}</p>
          <p>Arrival: {flightInfo.arrival}</p>
        </div>
      </div>
    </div>
  );
}
