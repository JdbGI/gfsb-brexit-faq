import { getFAQs } from "@/lib/data";
import HomeClient from "@/components/HomeClient";

export default async function Home() {
  const faqs = await getFAQs();
  return <HomeClient faqs={faqs} />;
}
