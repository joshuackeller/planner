import DatesWithTasksList from "@/components/DatesWithTasksList";
import { useContext } from "react";
import { AppContext } from "./_app";

export default function Home() {
  const { day } = useContext(AppContext);
  return <DatesWithTasksList period="year" day={day} />;
}
