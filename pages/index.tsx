import CalendarScreen from "@/components/CalendarScreen";
import { useContext } from "react";
import { AppContext } from "./_app";

export default function Home() {
  const { day } = useContext(AppContext);
  return <CalendarScreen period="days" day={day} />;
}
