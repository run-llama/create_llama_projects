import { FlightInfo } from "./shared";

export async function getFlightInfo(flightNumber: string): Promise<FlightInfo> {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return {
    flightNumber,
    departure: "New York",
    arrival: "San Francisco",
  };
}
